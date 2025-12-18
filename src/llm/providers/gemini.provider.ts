import {
  ErrorDetails,
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  SchemaType,
} from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';

import { RateLimiter } from '../../_lib/rate-limiter.util';
import { RateLimitError } from '../llm.error';
import { ReviewResultSchema } from '../llm.schema';
import type { LLMProvider, LLMReviewResult } from '../llm.types';
import { parseJSONResponse } from './lib/json.util';
import { convertToMilliseconds, isHourDelay } from './lib/time.util';

type RetryInfoDetails = ErrorDetails & {
  retryDelay?: string;
};

@Injectable()
export class GeminiProvider implements LLMProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string;
  private readonly rateLimiter: RateLimiter;

  constructor(private configService: ConfigService) {
    this.model = this.configService.llmModel;
    this.genAI = new GoogleGenerativeAI(this.configService.llmApiKey);
    this.rateLimiter = new RateLimiter(15, 0.25);
  }

  async reviewCode(prompt: string): Promise<LLMReviewResult> {
    await this.rateLimiter.consume(1);

    this.logger.log('Sending code to Gemini for review...');

    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            comments: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  line: {
                    type: SchemaType.NUMBER,
                    description: 'Line number from the diff',
                  },
                  severity: {
                    type: SchemaType.STRING,
                    description: 'Must be one of: info, warning, error',
                    enum: ['info', 'warning', 'error'],
                    format: 'enum',
                  },
                  message: {
                    type: SchemaType.STRING,
                    description: 'Concise description of the issue',
                  },
                },
                required: ['line', 'severity', 'message'],
              },
            },
          },
          required: ['comments'],
        },
      },
    });

    try {
      const { response } = await model.generateContent(prompt);
      const validated = ReviewResultSchema.parse(parseJSONResponse(response.text()));

      this.logger.log(`Gemini returned ${validated.comments.length} comments`);

      return validated;
    } catch (err: unknown) {
      if (err instanceof GoogleGenerativeAIFetchError) {
        const retryDetails = err.errorDetails?.find(
          (detail): detail is RetryInfoDetails => detail['@type']?.includes('RetryInfo') ?? false,
        );

        const delay = retryDetails?.retryDelay;

        if (delay && !isHourDelay(delay)) {
          throw new RateLimitError(
            'Gemini rate limit exceeded',
            delay,
            convertToMilliseconds(delay),
          );
        }
      }

      throw err;
    }
  }
}
