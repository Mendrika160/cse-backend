import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const createHelpRequestSchema = z.object({
  type: z.string().min(2),
  amount: z.number().int().positive(),
  description: z.string().min(5),
});

export type CreateHelpRequestDto = {
  type: string;
  amount: number;
  description: string;
};

export function parseCreateHelpRequestDto(payload: unknown): CreateHelpRequestDto {
  const parsed = createHelpRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid help request payload', parsed.error.flatten());
  }

  return parsed.data;
}
