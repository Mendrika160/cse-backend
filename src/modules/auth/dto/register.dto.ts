import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';
import type { Role } from '../../../generated/prisma/enums';

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6, 'Password must contain at least 6 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  role: z.enum(['MANAGER', 'BENEFICIARY']).default('BENEFICIARY'),
});

export type RegisterDto = {
  email: string;
  password: string;
  role: Extract<Role, 'MANAGER' | 'BENEFICIARY'>;
};

export function parseRegisterDto(payload: unknown): RegisterDto {
  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid register payload', parsed.error.flatten());
  }

  return parsed.data;
}
