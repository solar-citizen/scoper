import { Injectable, Logger } from '@nestjs/common';

import { RateLimitError } from './llm.error';
import { LLMReviewResult } from './llm.types';
import { GeminiProvider } from './providers/gemini.provider';
import { getGeminiErrorMessage, getOllamaErrorMessage } from './providers/lib/error.util';
import { OllamaProvider } from './providers/ollama.provider';

const oneHourMs = 60 * 60 * 1000;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private geminiConsecutiveRateLimits = 0;
  private readonly maxConsecutiveRateLimits = 3;
  private useOllamaOnly = false;
  private geminiBlockedUntil: number | null = null;
  private readonly geminiCooldownMs = oneHourMs;
  constructor(
    private geminiProvider: GeminiProvider,
    private ollamaProvider: OllamaProvider,
  ) {}

  async reviewCode(prompt: string): Promise<LLMReviewResult> {
    if (this.shouldUseOllamaOnly()) {
      const remainingMs = this.geminiBlockedUntil ? this.geminiBlockedUntil - Date.now() : 0;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      this.logger.log(
        `Using Ollama only due to repeated Gemini rate limits (${remainingMinutes}m remaining)`,
      );

      return await this.ollamaProvider.reviewCode(prompt);
    }

    try {
      const result = await this.geminiProvider.reviewCode(prompt);
      this.resetGeminiStatus();

      return result;
    } catch (geminiErr: unknown) {
      if (geminiErr instanceof RateLimitError) {
        this.geminiConsecutiveRateLimits++;
        this.logger.warn(
          `Gemini rate limit hit (${this.geminiConsecutiveRateLimits}/${this.maxConsecutiveRateLimits})`,
        );

        if (this.geminiConsecutiveRateLimits >= this.maxConsecutiveRateLimits) {
          this.useOllamaOnly = true;
          this.geminiBlockedUntil = Date.now() + this.geminiCooldownMs;
          this.logger.warn(
            `Switching to Ollama-only mode for ${this.geminiCooldownMs / 60000} minutes after ${this.maxConsecutiveRateLimits} consecutive rate limits`,
          );
        }

        throw geminiErr;
      }

      this.resetGeminiStatus();

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

  private shouldUseOllamaOnly(): boolean {
    if (!this.useOllamaOnly) {
      return false;
    }

    if (this.geminiBlockedUntil && Date.now() >= this.geminiBlockedUntil) {
      this.logger.log('Gemini cooldown period ended, re-enabling Gemini');
      this.resetGeminiStatus();

      return false;
    }

    return true;
  }

  private resetGeminiStatus(): void {
    this.geminiConsecutiveRateLimits = 0;
    this.useOllamaOnly = false;
    this.geminiBlockedUntil = null;
  }
}
