import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const listBeneficiariesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export type ListBeneficiariesQueryDto = {
  page: number;
  pageSize: number;
};

export function parseListBeneficiariesQueryDto(payload: unknown): ListBeneficiariesQueryDto {
  const parsed = listBeneficiariesQuerySchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid list beneficiaries query params', parsed.error.flatten());
  }

  return parsed.data;
}
