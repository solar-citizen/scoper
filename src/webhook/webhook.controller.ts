import { BadRequestException, Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { getErrorMessage } from 'src/lib/error.util';

import { GithubService } from '../github/github.service';
import { ReviewService } from '../review/review.service';
import type { WebhookPayloadDto } from './webhook-payload.dto';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private githubService: GithubService,
    private reviewService: ReviewService,
  ) {}

  @Post('github')
  async handleWebhook(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const payloadString = JSON.stringify(payload);

    if (!this.githubService.verifyWebhookSignature(payloadString, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { action } = payload;

    if (!['opened', 'synchronize'].includes(action)) {
      this.logger.log(`Ignoring PR action: ${action}`);
      return { message: 'Ignored' };
    }

    const context = {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pullNumber: payload.pull_request.number,
      sha: payload.pull_request.head.sha,
    };

    this.logger.log(`Processing PR #${context.pullNumber} - ${action}`);

    await this.reviewService.reviewPR(context).catch((err: unknown) => {
      this.logger.error(`Review failed for PR #${context.pullNumber}: ${getErrorMessage(err)}`);
    });

    return { message: 'Review started' };
  }
}
