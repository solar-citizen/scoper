import { z } from 'zod';

export const ReviewResultSchema = z.object({
  comments: z.array(
    z.object({
      line: z.number().int().positive(),
      severity: z.enum(['info', 'warning', 'error']),
      message: z.string().min(1),
    }),
  ),
});

export type ReviewResultDto = z.infer<typeof ReviewResultSchema>;
