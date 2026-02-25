import type { UserRole } from '../../../generated/prisma/enums';

export type UserResponseDto = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};
