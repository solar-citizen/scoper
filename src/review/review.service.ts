import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { getErrorMessage } from 'src/_lib/error.util';
import { oneSecondMs, sleep } from 'src/_lib/time.util';
import { ConfigService } from 'src/config/config.service';
import { GithubRateLimitError } from 'src/github/github.error';
import { RateLimitError } from 'src/llm/llm.error';

import {
  GithubService,
  type PRContext,
  type PRFile,
  type ReviewComment,
} from '../github/github.service';
import { LlmService } from '../llm/llm.service';
import { buildReviewPrompt } from './prompts/review-prompt.template';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  private readonly baseInstructions: string;
  private readonly ignoreList = ['bun.lock', 'package.json'];
  private readonly validationPhrases = [
    'good practice',
    'correct',
    'proper',
    'well done',
    'nicely',
    'great',
    'excellent',
    'appropriate',
    'follows best practice',
    'is preferred',
    'is recommended',
    'good way',
    'is good',
  ];

  constructor(
    private githubService: GithubService,
    private llmService: LlmService,
    private configService: ConfigService,
  ) {
    const instructionsPath = this.configService.reviewInstructionsPath;

    try {
      this.baseInstructions = readFileSync(instructionsPath, 'utf-8');
      this.logger.log(`Loaded base instructions from ${instructionsPath}`);
    } catch (err: unknown) {
      this.logger.warn(`Could not load base instructions: ${getErrorMessage(err)}`);
      this.baseInstructions = 'Follow general best practices.';
    }
  }

  async reviewPR(context: PRContext): Promise<void> {
    try {
      this.logger.log(`Starting review for PR #${context.pullNumber}`);

      const projectInstructions = await this.loadProjectInstructions(context);
      const files = await this.githubService.getPRFiles(context);
      const reviewableFiles = files.filter(
        (file): file is PRFile & { patch: string } =>
          Boolean(file.patch) &&
          !this.ignoreList.some((pattern) => file.filename.endsWith(pattern)),
      );

      if (!reviewableFiles.length) {
        this.logger.log('No reviewable files found');
        return;
      }

      const existingCommentsFingerprints =
        await this.githubService.getExistingScoperComments(context);

      const newComments: ReviewComment[] = [];

      for (let i = 0; i < reviewableFiles.length; i++) {
        const { filename, patch } = reviewableFiles[i];

        try {
          const fileComments = await this.reviewFile(filename, patch, projectInstructions);
          newComments.push(...fileComments);
        } catch (err: unknown) {
          if (err instanceof RateLimitError) {
            this.logger.warn(`LLM rate limit on ${filename}, waiting ${err.retryDelay}...`);
            await sleep(err.retryDelayMs);

            i--;

            continue;
          }

          this.logger.error(`Failed to review ${filename}: ${getErrorMessage(err)}`);
        }
      }

      const uniqueComments = this.githubService.filterDuplicateComments(
        newComments,
        existingCommentsFingerprints,
      );

      if (uniqueComments.length > 0) {
        const batchSize = 10;
        const batches = this.batchComments(uniqueComments, batchSize);

        this.logger.log(`Posting ${uniqueComments.length} comments in ${batches.length} batches`);

        for (let i = 0; i < batches.length; i++) {
          await this.postCommentsWithRetry(context, batches[i]);

          if (i < batches.length - oneSecondMs) {
            await sleep(oneSecondMs * 2);
          }
        }

        this.logger.log(`Review completed: ${uniqueComments.length} total comments posted`);
      } else {
        this.logger.log('Review completed: No new issues found');
      }
    } catch (err: unknown) {
      throw new Error(`PR review failed: ${getErrorMessage(err)}`);
    }
  }

  private batchComments(comments: ReviewComment[], batchSize: number): ReviewComment[][] {
    const batches: ReviewComment[][] = [];
    for (let i = 0; i < comments.length; i += batchSize) {
      batches.push(comments.slice(i, i + batchSize));
    }

    return batches;
  }

  private async postCommentsWithRetry(
    context: PRContext,
    comments: ReviewComment[],
    maxRetries = 3,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.githubService.postReviewComments(context, comments);
        this.logger.log(`Review completed: ${comments.length} new comments posted`);
        return;
      } catch (err: unknown) {
        if (err instanceof GithubRateLimitError) {
          const waitTime = Math.min(err.retryAfterMs * Math.pow(2, attempt), 5 * 60 * 1000);
          this.logger.warn(
            `GitHub ${err.isSecondary ? 'secondary' : 'primary'} rate limit hit. ` +
              `Waiting ${Math.ceil(waitTime / 1000)}s before retry ${attempt + 1}/${maxRetries}...`,
          );

          if (attempt < maxRetries - 1) {
            await sleep(waitTime);
            continue;
          }
        }
        throw err;
      }
    }
  }

  private async tryPaths(
    context: PRContext,
    paths: string[],
    label: string,
  ): Promise<string | undefined> {
    const tried: string[] = [];

    for (const path of paths) {
      const content = await this.githubService.getFileContent(
        context.owner,
        context.repo,
        path,
        context.sha,
      );

      if (content) {
        if (tried.length > 0) {
          this.logger.debug(`${label}: not found at [${tried.join(', ')}]`);
        }

        this.logger.log(`Found ${label} at: ${path}`);

        return content;
      }

      tried.push(path);
    }

    this.logger.error(`${label}: not found at any of [${tried.join(', ')}]`);

    return undefined;
  }

  private async loadProjectInstructions(context: PRContext): Promise<string | undefined> {
    const scoperPaths = ['.scoper.md', '.scoper/rules.md', '.github/scoper.md', 'docs/scoper.md'];
    const copilotPaths = ['.github/copilot-instructions.md'];

    const [scoperInstructions, copilotInstructions] = await Promise.all([
      this.tryPaths(context, scoperPaths, 'Scoper instructions'),
      this.tryPaths(context, copilotPaths, 'Copilot instructions'),
    ]);

    if (scoperInstructions && copilotInstructions) {
      this.logger.log('Merging Scoper + Copilot instructions');

      return `# Scoper-Specific Instructions: ${scoperInstructions}
      # Additional Context from Copilot Instructions: ${copilotInstructions}`;
    }

    return scoperInstructions ?? copilotInstructions;
  }

  private async reviewFile(
    filename: string,
    patch: string,
    projectInstructions?: string,
  ): Promise<ReviewComment[]> {
    this.logger.log(`Reviewing file: ${filename}`);

    const { comments } = await this.llmService.reviewCode(
      buildReviewPrompt(filename, patch, this.baseInstructions, projectInstructions),
    );

    const filteredComments = comments.filter(({ message }) => {
      if (this.validationPhrases.some((phrase) => message.toLowerCase().includes(phrase))) {
        this.logger.debug(`Filtered validation comment: ${message.substring(0, 50)}...`);
        return false;
      }

      return true;
    });

    const githubComments: ReviewComment[] = filteredComments.map(({ line, message, severity }) => ({
      path: filename,
      line,
      side: 'RIGHT' as const,
      body: this.formatCommentBody(severity, message),
    }));

    const validatedComments = this.githubService.validateComments(patch, githubComments);
    const infoFiltered = comments.length - filteredComments.length;
    const lineFiltered = githubComments.length - validatedComments.length;

    this.logger.log(
      `File ${filename}: ${validatedComments.length} comments (${infoFiltered} filtered, ${lineFiltered} line filtered)`,
    );

    return validatedComments;
  }

  private formatCommentBody(severity: string, message: string): string {
    const emoji =
      {
        error: '🚨',
        warning: '⚠️',
        info: 'ℹ️',
      }[severity] ?? 'ℹ️';

    return `🤖 **Scoper review:**\n\n${emoji} **${severity.toUpperCase()}**: ${message}`;
  }
}
