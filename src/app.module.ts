import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { GithubModule } from './github/github.module';
import { LlmModule } from './src/llm/llm.module';

@Module({
  imports: [ConfigModule, LlmModule, GithubModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
