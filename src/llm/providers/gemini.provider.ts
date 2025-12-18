import {
  ErrorDetails,
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  SchemaType,
} from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { oneMinuteMs, sleep } from 'src/_lib/time.util';
import { ConfigService } from 'src/config/config.service';

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
  private readonly requestTimestamps: number[] = [];
  private readonly maxRequestsPerMinute = 15;
  private readonly timeWindowMs = oneMinuteMs;

  constructor(private configService: ConfigService) {
    this.model = this.configService.llmModel;
    this.genAI = new GoogleGenerativeAI(this.configService.llmApiKey);
  }

  async reviewCode(prompt: string): Promise<LLMReviewResult> {
    const now = Date.now();
    const oneMinuteAgo = now - this.timeWindowMs;

    // Remove timestamps older than 1 minute
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] < oneMinuteAgo) {
      this.requestTimestamps.shift();
    }

    // If we're at limit, wait until oldest request expires
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const waitMs = this.requestTimestamps[0] + this.timeWindowMs - now;

      if (waitMs > 0) {
        this.logger.log(
          `Rate limit: ${this.requestTimestamps.length}/${this.maxRequestsPerMinute} requests in last minute. ` +
            `Waiting ${Math.ceil(waitMs / 1000)}s...`,
        );
        await sleep(waitMs);

        const afterWaitCutoff = Date.now() - this.timeWindowMs;
        while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] < afterWaitCutoff) {
          this.requestTimestamps.shift();
        }
      }
    }

    this.requestTimestamps.push(Date.now());

    if (this.requestTimestamps.length > this.maxRequestsPerMinute * 2) {
      this.requestTimestamps.splice(0, this.requestTimestamps.length - this.maxRequestsPerMinute);
    }

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
