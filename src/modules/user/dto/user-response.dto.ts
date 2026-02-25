import type { UserModel } from '../../../generated/prisma/models/User';

export type UserResponseDto = Pick<UserModel, 'id' | 'email' | 'role' | 'createdAt' | 'updatedAt'>;
