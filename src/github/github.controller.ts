import { BadRequestException, Body, Controller, Headers, Logger, Post } from '@nestjs/common';

// import { ReviewService } from '../review/review.service';
import type { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { GithubService } from './github.service';

@Controller('webhook')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(
    private githubService: GithubService,
    // private reviewService: ReviewService,
  ) {}

  @Post('github')
  handleWebhook(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    // Verify webhook signature for security
    const payloadString = JSON.stringify(payload);

    if (!this.githubService.verifyWebhookSignature(payloadString, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { action } = payload;

    // Only process opened and synchronized (updated) PRs
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

    // Trigger review asynchronously (don't block webhook response)
    // await this.reviewService.reviewPR(context).catch(err => {
    //   this.logger.error(`Review failed for PR #${context.pullNumber}: ${err.message}`);
    // });

    return { message: 'Review started' };
  }
}
