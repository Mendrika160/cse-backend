import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const listHelpRequestQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export type ListHelpRequestQueryDto = {
  page: number;
  pageSize: number;
};

export function parseListHelpRequestQueryDto(payload: unknown): ListHelpRequestQueryDto {
  const parsed = listHelpRequestQuerySchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid list requests query params', parsed.error.flatten());
  }

  return parsed.data;
}
