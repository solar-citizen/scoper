import { Module } from '@nestjs/common';

import { GithubModule } from '../github/github.module';
import { ReviewModule } from '../review/review.module';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [GithubModule, ReviewModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
