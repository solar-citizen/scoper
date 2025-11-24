import { Module } from '@nestjs/common';

import { LlmService } from './llm.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OllamaProvider } from './providers/ollama.provider';

@Module({
  providers: [LlmService, GeminiProvider, OllamaProvider],
  exports: [LlmService],
})
export class LlmModule {}
