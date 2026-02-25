import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const findUserByEmailQuerySchema = z.object({
  email: z.string().email(),
});

export type FindUserByEmailDto = {
  email: string;
};

export function parseFindUserByEmailDto(payload: unknown): FindUserByEmailDto {
  const parsed = findUserByEmailQuerySchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid find user by email query', parsed.error.flatten());
  }

  return parsed.data;
}
