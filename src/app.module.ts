import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { GithubModule } from './github/github.module';

@Module({
  imports: [ConfigModule, GithubModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
