import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDto = {
  email: string;
  password: string;
};

export function parseLoginDto(payload: unknown): LoginDto {
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid login payload', parsed.error.flatten());
  }

  return parsed.data;
}
