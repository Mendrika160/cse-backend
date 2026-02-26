import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const listBudgetQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export type ListBudgetQueryDto = {
  page: number;
  pageSize: number;
};

export function parseListBudgetQueryDto(payload: unknown): ListBudgetQueryDto {
  const parsed = listBudgetQuerySchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid list budgets query params', parsed.error.flatten());
  }

  return parsed.data;
}
