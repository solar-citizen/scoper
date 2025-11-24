import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { LlmModule } from './src/llm/llm.module';

@Module({
  imports: [ConfigModule, LlmModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
