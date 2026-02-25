import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const upsertBudgetSchema = z.object({
  year: z.number().int().min(2000).max(3000),
  totalAmount: z.number().int().nonnegative(),
});

export type UpsertBudgetDto = {
  year: number;
  totalAmount: number;
};

export function parseUpsertBudgetDto(payload: unknown): UpsertBudgetDto {
  const parsed = upsertBudgetSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid budget payload', parsed.error.flatten());
  }

  return parsed.data;
}
