import type { RequestHandler, Router } from 'express';
import { Router as createRouter } from 'express';
import type { Action, Resource, UserRole } from '../../generated/prisma/enums';
import type { BudgetController } from './budget.controller';

type BudgetRouteGuards = {
  requireAuth: RequestHandler;
  requireRole: (role: UserRole) => RequestHandler;
  requirePermission: (resource: Resource, action: Action) => RequestHandler;
};

export function createBudgetRoutes(controller: BudgetController, guards: BudgetRouteGuards): Router {
  const router = createRouter();

  router.get(
    '/budgets',
    guards.requireAuth,
    guards.requireRole('ADMIN'),
    guards.requirePermission('BUDGET', 'READ'),
    controller.list,
  );

  router.post(
    '/budgets',
    guards.requireAuth,
    guards.requireRole('ADMIN'),
    guards.requirePermission('BUDGET', 'UPDATE'),
    controller.create,
  );

  router.get(
    '/budget',
    guards.requireAuth,
    guards.requireRole('ADMIN'),
    guards.requirePermission('BUDGET', 'READ'),
    controller.get,
  );

  router.put(
    '/budget',
    guards.requireAuth,
    guards.requireRole('ADMIN'),
    guards.requirePermission('BUDGET', 'UPDATE'),
    controller.upsert,
  );

  return router;
}
