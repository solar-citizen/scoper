import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';

import { ReviewResultSchema } from '../llm.schema';
import type { LLMProvider, LLMReviewResult } from '../llm.types';
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

    const { response } = await model.generateContent(prompt);
    const validated = ReviewResultSchema.parse(parseJSONResponse(response.text()));

    this.logger.log(`Gemini returned ${validated.comments.length} comments`);

    return validated;
  }
}
