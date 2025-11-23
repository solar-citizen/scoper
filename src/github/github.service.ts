import { Injectable, Logger } from '@nestjs/common';
import { RequestError } from '@octokit/request-error';
import { Octokit } from '@octokit/rest';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from 'src/config/config.service';

import type { PRContext, PRFile, ReviewComment } from './lib/types/github.types';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly octokit: Octokit;

  constructor(private configService: ConfigService) {
    this.octokit = new Octokit({ auth: this.configService.githubToken });
  }

  async getPRFiles(context: PRContext): Promise<PRFile[]> {
    try {
      const { data: files } = await this.octokit.pulls.listFiles({
        owner: context.owner,
        repo: context.repo,
        pull_number: context.pullNumber,
      });

      this.logger.log(`Fetched ${files.length} files from PR #${context.pullNumber}`);
      return files;
    } catch (err: unknown) {
      this.logError('Failed to fetch PR files', err);
      throw err;
    }
  }

  async postReviewComments(context: PRContext, comments: ReviewComment[]): Promise<void> {
    try {
      if (comments.length === 0) {
        this.logger.log('No comments to post');
        return;
      }

      await this.octokit.pulls.createReview({
        owner: context.owner,
        repo: context.repo,
        pull_number: context.pullNumber,
        event: 'COMMENT',
        comments,
      });

      this.logger.log(`Posted ${comments.length} comments to PR #${context.pullNumber}`);
    } catch (err: unknown) {
      this.logError('Failed to post comments', err);
      throw err;
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
    const secret = this.configService.githubWebHookSecret;
    const hmac = createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

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
}
