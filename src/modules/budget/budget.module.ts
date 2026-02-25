import type { RequestHandler, Router } from 'express';
import type { Action, Resource, UserRole } from '../../generated/prisma/enums';
import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../prisma/prisma.service';
import { BudgetController } from './budget.controller';
import { createBudgetRoutes } from './budget.routes';
import { BudgetService } from './budget.service';

type BudgetModuleGuards = {
  requireAuth: RequestHandler;
  requireRole: (role: UserRole) => RequestHandler;
  requirePermission: (resource: Resource, action: Action) => RequestHandler;
};

export function createBudgetModule(
  prismaService: PrismaService,
  auditLogService: AuditLogService,
  guards: BudgetModuleGuards,
): Router {
  const service = new BudgetService(prismaService, auditLogService);
  const controller = new BudgetController(service);

  return createBudgetRoutes(controller, guards);
}
