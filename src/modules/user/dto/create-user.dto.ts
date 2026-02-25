import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';
import type { UserRole } from '../../../generated/prisma/enums';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6, 'Password must contain at least 6 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  role: z.enum(['ADMIN', 'MANAGER', 'BENEFICIARY']).default('BENEFICIARY'),
});

export type CreateUserDto = {
  email: string;
  password: string;
  role: UserRole;
};

export function parseCreateUserDto(payload: unknown): CreateUserDto {
  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid create user payload', parsed.error.flatten());
  }

  return parsed.data;
}
