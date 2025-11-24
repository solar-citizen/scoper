import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';

import { ReviewResultSchema } from '../llm.schema';
import type { LLMProvider, LLMReviewResult } from '../llm.types';
import { getGeminiErrorMessage } from './lib/error.util';
import { parseJSONResponse } from './lib/json.util';

@Injectable()
export class GeminiProvider implements LLMProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.model = this.configService.llmModel;
    this.genAI = new GoogleGenerativeAI(this.configService.llmApiKey);
  }

  async reviewCode(prompt: string): Promise<LLMReviewResult> {
    try {
      this.logger.log('Sending code to Gemini for review...');

      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        },
      });

      const result = await model.generateContent(prompt);
      const validated = ReviewResultSchema.parse(parseJSONResponse(result.response.text()));

      this.logger.log(`Gemini returned ${validated.comments.length} comments`);

      return validated;
    } catch (err: unknown) {
      this.logger.error(`Gemini review failed: ${getGeminiErrorMessage(err)}`);
      throw err;
    }
  }
}
