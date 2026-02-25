import type { Request, RequestHandler, Router } from 'express';
import type { Action, Resource, UserRole } from '../../generated/prisma/enums';
import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import {
  createRequireAuth,
  createRequirePermission,
  createRequirePermissionOrSelf,
  createRequireRole,
} from './auth.guards';
import { createAuthRoutes } from './auth.routes';
import { AuthService } from './auth.service';

type OwnerIdResolver = (req: Request) => string | undefined;

export type AuthModule = {
  router: Router;
  requireAuth: RequestHandler;
  requireRole: (role: UserRole) => RequestHandler;
  requirePermission: (resource: Resource, action: Action) => RequestHandler;
  requirePermissionOrSelf: (
    resource: Resource,
    action: Action,
    resolveOwnerId: OwnerIdResolver,
  ) => RequestHandler;
};

export function createAuthModule(prismaService: PrismaService, auditLogService: AuditLogService): AuthModule {
  const authService = new AuthService(prismaService, auditLogService);
  const authController = new AuthController(authService);
  const requireAuth = createRequireAuth(authService);

  return {
    router: createAuthRoutes(authController, { requireAuth }),
    requireAuth,
    requireRole: (role: UserRole) => createRequireRole(role),
    requirePermission: (resource: Resource, action: Action) =>
      createRequirePermission(resource, action),
    requirePermissionOrSelf: (
      resource: Resource,
      action: Action,
      resolveOwnerId: OwnerIdResolver,
    ) => createRequirePermissionOrSelf(resource, action, resolveOwnerId),
  };
}
