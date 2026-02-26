import type { Request, RequestHandler } from 'express';
import { Router } from 'express';
import type { Action, Resource, UserRole } from '../../generated/prisma/enums';
import type { UserController } from './user.controller';

type UserRouteGuards = {
  requireAuth: RequestHandler;
  requireRole: (role: UserRole) => RequestHandler;
  requirePermission: (resource: Resource, action: Action) => RequestHandler;
  requirePermissionOrSelf: (
    resource: Resource,
    action: Action,
    resolveOwnerId: (req: Request) => string | undefined,
  ) => RequestHandler;
};

export function createUserRoutes(controller: UserController, guards: UserRouteGuards): Router {
  const router = Router();

  router.get(
    '/beneficiaries',
    guards.requireAuth,
    guards.requireRole('ADMIN'),
    guards.requirePermission('BENEFICIARY', 'READ'),
    controller.listBeneficiaries,
  );

  router.get('/users/by-email', controller.findByEmail);
  router.get('/users/:id', controller.findById);
  router.post(
    '/users',
    guards.requireAuth,
    guards.requireRole('ADMIN'),
    guards.requirePermission('BENEFICIARY', 'CREATE'),
    controller.create,
  );
  router.patch(
    '/users/:id',
    guards.requireAuth,
    guards.requirePermissionOrSelf('BENEFICIARY', 'UPDATE', (req) =>
      typeof req.params.id === 'string' ? req.params.id : undefined,
    ),
    controller.edit,
  );

  return router;
}
