import type { Request, RequestHandler, Router } from 'express';
import type { Action, Resource, UserRole } from '../../generated/prisma/enums';
import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../prisma/prisma.service';
import { UserController } from './user.controller';
import { createUserRoutes } from './user.routes';
import { UserService } from './user.service';

type UserModuleGuards = {
  requireAuth: RequestHandler;
  requireRole: (role: UserRole) => RequestHandler;
  requirePermission: (resource: Resource, action: Action) => RequestHandler;
  requirePermissionOrSelf: (
    resource: Resource,
    action: Action,
    resolveOwnerId: (req: Request) => string | undefined,
  ) => RequestHandler;
};

export function createUserModule(
  prismaService: PrismaService,
  auditLogService: AuditLogService,
  guards: UserModuleGuards,
): Router {
  const userService = new UserService(prismaService, auditLogService);
  const userController = new UserController(userService);

  return createUserRoutes(userController, guards);
}
