import { z } from 'zod';
import { BadRequestError } from '../../../core/errors/bad-request-error';
import type { UserRole } from '../../../generated/prisma/enums';

const editUserSchema = z
  .object({
    email: z.string().email().optional(),
    password: z
      .string()
      .min(6, 'Password must contain at least 6 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'BENEFICIARY']).optional(),
  })
  .refine(
    (value) => value.email !== undefined || value.password !== undefined || value.role !== undefined,
    {
      message: 'At least one field is required',
    },
  );

export type EditUserDto = {
  email?: string;
  password?: string;
  role?: UserRole;
};

export function parseEditUserDto(payload: unknown): EditUserDto {
  const parsed = editUserSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BadRequestError('Invalid edit user payload', parsed.error.flatten());
  }

  return parsed.data;
}
