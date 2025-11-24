import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { GithubModule } from './github/github.module';
import { LlmModule } from './llm/llm.module';
import { ReviewModule } from './review/review.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [ConfigModule, LlmModule, GithubModule, ReviewModule, WebhookModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
