import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const getBudgetQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
});

export type GetBudgetQueryDto = {
  year: number;
};

export function parseGetBudgetQueryDto(payload: unknown): GetBudgetQueryDto {
  const parsed = getBudgetQuerySchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid budget query', parsed.error.flatten());
  }

  return {
    year: parsed.data.year ?? new Date().getUTCFullYear(),
  };
}
