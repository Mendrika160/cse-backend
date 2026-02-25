import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const editHelpRequestSchema = z
  .object({
    type: z.string().min(2).optional(),
    amount: z.number().int().positive().optional(),
    description: z.string().min(5).optional(),
  })
  .refine(
    (value) => value.type !== undefined || value.amount !== undefined || value.description !== undefined,
    { message: 'At least one field is required' },
  );

export type EditHelpRequestDto = {
  type?: string;
  amount?: number;
  description?: string;
};

export function parseEditHelpRequestDto(payload: unknown): EditHelpRequestDto {
  const parsed = editHelpRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid help request edit payload', parsed.error.flatten());
  }

  return parsed.data;
}
