import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { z } from 'zod';

const envs = ['development', 'production'] as const;

const validationObject = z.object({
  APP_ENV: z.enum(envs),
  APP_PORT: z.coerce.number().int().min(0).max(65535),
  REVIEW_INSTRUCTIONS_PATH: z.string(),
  GITHUB_TOKEN: z.string(),
  GITHUB_WEBHOOK_SECRET: z.string(),
  LLM_API_KEY: z.string(),
  LLM_MODEL: z.string(),
  LOCAL_LLM_BASE_URL: z.url(),
  LOCAL_LLM_MODEL: z.string(),
});

@Injectable()
export class ConfigService {
  static validate = (config: Record<string, unknown>): z.infer<typeof validationObject> =>
    validationObject.parse(config);

  constructor(
    private readonly configService: NestConfigService<z.infer<typeof validationObject>, true>,
  ) {}

  get env(): (typeof envs)[number] {
    return this.configService.get('APP_ENV');
  }

  get port(): number {
    return Number(this.configService.get('APP_PORT'));
  }

  get reviewInstructionsPath(): string {
    return this.configService.get('REVIEW_INSTRUCTIONS_PATH');
  }

  get githubToken(): string {
    return this.configService.get<string>('GITHUB_TOKEN');
  }

  get githubWebHookSecret(): string {
    return this.configService.get<string>('GITHUB_WEBHOOK_SECRET');
  }

  get llmApiKey(): string {
    return this.configService.get<string>('LLM_API_KEY');
  }

  get llmModel(): string {
    return this.configService.get<string>('LLM_MODEL');
  }

  get localLlmBaseUrl(): string {
    return this.configService.get<string>('LOCAL_LLM_BASE_URL');
  }

  get localLlmModel(): string {
    return this.configService.get<string>('LOCAL_LLM_MODEL');
  }
}
