import { Injectable, Logger } from '@nestjs/common';
import { RequestError } from '@octokit/request-error';
import { Octokit } from '@octokit/rest';
import { createHmac, timingSafeEqual } from 'crypto';
import { getErrorMessage } from 'src/_lib/error.util';
import { ConfigService } from 'src/config/config.service';
import { extractValidLineNumbers } from 'src/review/prompts/prompt.util';

import { GithubRateLimitError } from './github.error';

const oneMinuteMs = 60000;

export type PRFile = {
  filename: string;
  patch?: string;
  status: string;
};

export type PRContext = {
  owner: string;
  repo: string;
  pullNumber: number;
  sha: string;
};

export type ReviewComment = {
  path: string;
  line: number;
  side: 'RIGHT';
  body: string;
};

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly octokit: Octokit;

  constructor(private configService: ConfigService) {
    this.octokit = new Octokit({ auth: this.configService.githubToken });
  }

  async getPRFiles({ owner, repo, pullNumber }: PRContext): Promise<PRFile[]> {
    try {
      const { data } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
      });

      this.logger.log(`Fetched ${data.length} files from ${repo}, PR #${pullNumber}`);

      return data;
    } catch (err: unknown) {
      this.logError('Failed to fetch PR files', err);
      throw err;
    }
  }

  async postReviewComments(
    { owner, repo, pullNumber }: PRContext,
    comments: ReviewComment[],
  ): Promise<void> {
    try {
      if (comments.length === 0) {
        this.logger.log('No comments to post');
        return;
      }

      await this.octokit.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        event: 'COMMENT',
        comments,
      });

      this.logger.log(`Posted ${comments.length} comments to PR #${pullNumber}`);
    } catch (err: unknown) {
      this.handleGithubError('Failed to post comments', err);
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<string | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if ('content' in data) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      return null;
    } catch (err: unknown) {
      this.logError('Failed to get file content', err);
      return null;
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hmac = createHmac('sha256', this.configService.githubWebHookSecret);
    const digest = `sha256=${hmac.update(payload).digest('hex')}`;

    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  private logError(operation: string, err: unknown): void {
    if (err instanceof RequestError) {
      this.logger.error(`${operation}: ${err.message}`, {
        status: err.status,
        request: err.request,
      });
    } else if (err instanceof Error) {
      this.logger.error(`${operation}: ${err.message}`);
    } else {
      this.logger.error(`${operation}: ${String(err)}`);
    }
  }

  validateComments(patch: string, comments: ReviewComment[]): ReviewComment[] {
    const validLines = new Set(extractValidLineNumbers(patch));

    const validComments = comments.filter(({ line }) => {
      const isValid = validLines.has(line);

      if (!isValid) {
        this.logger.warn(`Skipping comment at invalid line ${line}`);
      }

      return isValid;
    });

    this.logger.log(`Validated ${validComments.length}/${comments.length} comments`);

    return validComments;
  }

  async getExistingScoperComments({ owner, repo, pullNumber }: PRContext): Promise<Set<string>> {
    try {
      const { data: comments } = await this.octokit.pulls.listReviewComments({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
      });

      const existingMap = new Set<string>();

      for (const comment of comments) {
        if (!comment.line) {
          continue;
        }

        if (comment.body.includes('🤖 **Scoper review:**')) {
          existingMap.add(`${comment.path}:${comment.line}`);
        }
      }

      return existingMap;
    } catch (err: unknown) {
      this.logError('Failed to fetch existing comments', err);
      return new Set();
    }
  }

  filterDuplicateComments(
    newComments: ReviewComment[],
    existingCommentsFingerprints: Set<string>,
  ): ReviewComment[] {
    const uniqueComments: ReviewComment[] = [];

    for (const comment of newComments) {
      const key = `${comment.path}:${comment.line}`;

      if (existingCommentsFingerprints.has(key)) {
        this.logger.debug(`Skipping duplicate comment on ${key}`);
        continue;
      }

      uniqueComments.push(comment);
    }

    return uniqueComments;
  }

  private handleGithubError(operation: string, err: unknown): never {
    if (err instanceof RequestError) {
      if (err.status === 403 && err.message.includes('secondary rate limit')) {
        this.logger.error(`${operation}: Secondary rate limit hit`);
        throw new GithubRateLimitError(err.message, oneMinuteMs, true);
      }

      if (err.status === 403 && err.response?.headers['x-ratelimit-remaining'] === '0') {
        const resetTime = err.response.headers['x-ratelimit-reset'];
        const retryAfterMs = resetTime ? parseInt(resetTime) * 1000 - Date.now() : oneMinuteMs;

        this.logger.error(`${operation}: Primary rate limit hit`);

        throw new GithubRateLimitError(err.message, retryAfterMs, false);
      }

      this.logger.error(`${operation}: ${err.message}`, {
        status: err.status,
        request: err.request,
      });
    } else {
      this.logger.error(`${operation}: ${getErrorMessage(err)}`);
    }

    throw err;
  }
}
