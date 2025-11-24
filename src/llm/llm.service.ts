import { Injectable, Logger } from '@nestjs/common';

import { LLMReviewResult } from './llm.types';
import { GeminiProvider } from './providers/gemini.provider';
import { getGeminiErrorMessage, getOllamaErrorMessage } from './providers/lib/error.util';
import { OllamaProvider } from './providers/ollama.provider';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private geminiProvider: GeminiProvider,
    private ollamaProvider: OllamaProvider,
  ) {}

  async reviewCode(prompt: string): Promise<LLMReviewResult> {
    try {
      return await this.geminiProvider.reviewCode(prompt);
    } catch (geminiErr: unknown) {
      this.logger.warn(
        `Gemini failed, falling back to Ollama: ${getGeminiErrorMessage(geminiErr)}`,
      );

      try {
        return await this.ollamaProvider.reviewCode(prompt);
      } catch (ollamaErr: unknown) {
        throw new Error(`
            Both providers failed.
            Gemini: ${getGeminiErrorMessage(geminiErr)}, 
            Ollama: ${getOllamaErrorMessage(ollamaErr)}
        `);
      }
    }
  }
}
