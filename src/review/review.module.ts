import { Module } from '@nestjs/common';

import { GithubModule } from '../github/github.module';
import { LlmModule } from '../llm/llm.module';
import { ReviewService } from './review.service';

@Module({
  imports: [GithubModule, LlmModule],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
