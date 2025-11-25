import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { getErrorMessage } from 'src/_lib/error.util';
import { ConfigService } from 'src/config/config.service';

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
  private readonly generatedFiles = ['bun.lock'];

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

      if (projectInstructions) {
        this.logger.log('Loaded project-specific instructions');
      } else {
        this.logger.log('No project-specific instructions found, using base only');
      }

      const files = await this.githubService.getPRFiles(context);
      const reviewableFiles = files.filter(
        (file): file is PRFile & { patch: string } =>
          Boolean(file.patch) && !this.generatedFiles.includes(file.filename),
      );

      if (!reviewableFiles.length) {
        this.logger.log('No reviewable files found');
        return;
      }

      const existingCommentsFingerprints =
        await this.githubService.getExistingScoperComments(context);
      this.logger.log(`Found ${existingCommentsFingerprints.size} existing Scoper comments`);

      const allNewComments: ReviewComment[] = [];

      for (const { filename, patch } of reviewableFiles) {
        try {
          const fileComments = await this.reviewFile(filename, patch, projectInstructions);
          allNewComments.push(...fileComments);
        } catch (err: unknown) {
          this.logger.error(`Failed to review ${filename}: ${getErrorMessage(err)}`);
        }
      }

      const uniqueComments = this.githubService.filterDuplicateComments(
        allNewComments,
        existingCommentsFingerprints,
      );

      if (uniqueComments.length > 0) {
        await this.githubService.postReviewComments(context, uniqueComments);
        this.logger.log(`Review completed: ${uniqueComments.length} new comments posted`);
      } else {
        this.logger.log('Review completed: No new issues found');
      }
    } catch (err: unknown) {
      throw new Error(`PR review failed: ${getErrorMessage(err)}`);
    }
  }

  private async loadProjectInstructions(context: PRContext): Promise<string | undefined> {
    const instructionSources = {
      scoper: ['.scoper.md', '.scoper/rules.md', '.github/scoper.md', 'docs/scoper.md'],
      copilot: ['.github/copilot-instructions.md'],
    };

    let scoperInstructions: string | null = null;
    let copilotInstructions: string | null = null;

    for (const path of instructionSources.scoper) {
      try {
        const content = await this.githubService.getFileContent(
          context.owner,
          context.repo,
          path,
          context.sha,
        );

        if (content) {
          this.logger.log(`Found Scoper instructions at: ${path}`);
          scoperInstructions = content;
          break;
        }
      } catch (err: unknown) {
        this.logger.warn(`Error loading Scoper instructions: ${getErrorMessage(err)}`);
        continue;
      }
    }

    for (const path of instructionSources.copilot) {
      try {
        const content = await this.githubService.getFileContent(
          context.owner,
          context.repo,
          path,
          context.sha,
        );

        if (content) {
          this.logger.log(`Found Copilot instructions at: ${path}`);
          copilotInstructions = content;
          break;
        }
      } catch (err: unknown) {
        this.logger.warn(`Error loading Copilot instructions: ${getErrorMessage(err)}`);
        continue;
      }
    }

    if (scoperInstructions && copilotInstructions) {
      this.logger.log('Merging Scoper + Copilot instructions');
      return this.mergeInstructions(scoperInstructions, copilotInstructions);
    }

    if (scoperInstructions) {
      return scoperInstructions;
    }

    if (copilotInstructions) {
      return copilotInstructions;
    }

    return undefined;
  }

  private mergeInstructions(scoperInstructions: string, copilotInstructions: string): string {
    return `# Scoper-Specific Instructions: ${scoperInstructions}
    # Additional Context from Copilot Instructions: ${copilotInstructions}`;
  }

  private async reviewFile(
    filename: string,
    patch: string,
    projectInstructions?: string,
  ): Promise<ReviewComment[]> {
    this.logger.log(`Reviewing file: ${filename}`);

    const prompt = buildReviewPrompt(filename, patch, this.baseInstructions, projectInstructions);
    const { comments } = await this.llmService.reviewCode(prompt);

    const githubComments: ReviewComment[] = comments.map(({ line, message, severity }) => ({
      path: filename,
      line,
      side: 'RIGHT' as const,
      body: this.formatCommentBody(severity, message),
    }));

    const validatedComments = this.githubService.validateComments(patch, githubComments);

    this.logger.log(
      `File ${filename}: ${validatedComments.length} comments(${githubComments.length - validatedComments.length} filtered)`,
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
