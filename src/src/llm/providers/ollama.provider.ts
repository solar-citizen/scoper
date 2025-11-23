import { Injectable, Logger } from '@nestjs/common';
import { Ollama } from 'ollama';
import { ConfigService } from 'src/config/config.service';

import { ReviewResultSchema } from '../dto/review-result.dto';
import type { LLMProvider, LLMReviewResult } from '../types/llm.types';
import { getOllamaErrorMessage } from './error.util';
import { parseJSONResponse } from './json.util';

@Injectable()
export class OllamaProvider implements LLMProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly ollama: Ollama;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.model = this.configService.localLlmBaseUrl;
    this.ollama = new Ollama({ host: this.configService.localLlmBaseUrl });
  }

  async reviewCode(prompt: string): Promise<LLMReviewResult> {
    try {
      this.logger.log('Sending code to Ollama for review (fallback)...');

      const response = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.95,
          top_k: 40,
        },
      });

      const validated = ReviewResultSchema.parse(parseJSONResponse(response.response));

      this.logger.log(`Ollama returned ${validated.comments.length} comments`);

      return validated;
    } catch (err: unknown) {
      this.logger.error(`Ollama review failed: ${getOllamaErrorMessage(err)}`);
      throw err;
    }
  }
}
