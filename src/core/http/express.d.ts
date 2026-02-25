import type { Action, Resource, UserRole } from '../../generated/prisma/enums';
import type { HelpRequestResponseDto } from '../../modules/help-request/dto/help-request-response.dto';

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
      helpRequest?: HelpRequestResponseDto;
    }
  }
}

export {};
