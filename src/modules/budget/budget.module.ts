import type { RequestHandler, Router } from 'express';
import type { Action, Resource, UserRole } from '../../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { BudgetController } from './budget.controller';
import { createBudgetRoutes } from './budget.routes';
import { BudgetService } from './budget.service';

type BudgetModuleGuards = {
  requireAuth: RequestHandler;
  requireRole: (role: UserRole) => RequestHandler;
  requirePermission: (resource: Resource, action: Action) => RequestHandler;
};

export function createBudgetModule(prismaService: PrismaService, guards: BudgetModuleGuards): Router {
  const service = new BudgetService(prismaService);
  const controller = new BudgetController(service);

  return createBudgetRoutes(controller, guards);
}
