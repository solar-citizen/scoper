import { Injectable, Logger } from '@nestjs/common';
import { Ollama } from 'ollama';
import { ConfigService } from 'src/config/config.service';

import { ReviewResultSchema } from '../llm.schema';
import type { LLMProvider, LLMReviewResult } from '../llm.types';
import { parseJSONResponse } from './lib/json.util';

@Injectable()
export class OllamaProvider implements LLMProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly ollama: Ollama;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.model = this.configService.localLlmModel;
    this.ollama = new Ollama({ host: this.configService.localLlmBaseUrl });
  }

  async reviewCode(prompt: string): Promise<LLMReviewResult> {
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
  }
}
