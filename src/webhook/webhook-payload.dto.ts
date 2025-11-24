import { z } from 'zod';

export const WebhookPayloadSchema = z.object({
  action: z.string(),
  number: z.number(),
  pull_request: z.object({
    number: z.number(),
    head: z.object({
      sha: z.string(),
    }),
  }),
  repository: z.object({
    owner: z.object({
      login: z.string(),
    }),
    name: z.string(),
  }),
});

export type WebhookPayloadDto = z.infer<typeof WebhookPayloadSchema>;
