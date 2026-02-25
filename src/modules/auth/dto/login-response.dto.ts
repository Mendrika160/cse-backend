import type { UserRole } from '../../../generated/prisma/enums';

export type LoginResponseDto = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
};
