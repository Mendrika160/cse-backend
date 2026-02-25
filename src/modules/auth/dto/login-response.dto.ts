import type { Role } from '../../../generated/prisma/enums';

export type LoginResponseDto = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
};
