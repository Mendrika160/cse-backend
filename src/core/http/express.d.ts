import type { Action, Resource, UserRole } from '../../generated/prisma/enums';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        email: string;
        role: UserRole;
        permissions: Array<{
          resource: Resource;
          action: Action;
        }>;
      };
    }
  }
}

export {};
