import type { RequestHandler, Router } from 'express';
import type { Action, Resource } from '../../generated/prisma/enums';
import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../prisma/prisma.service';
import { HelpRequestController } from './help-request.controller';
import { createHelpRequestPolicies } from './help-request.policy';
import { createHelpRequestRoutes } from './help-request.routes';
import { HelpRequestService } from './help-request.service';

type HelpRequestModuleGuards = {
  requireAuth: RequestHandler;
  requirePermission: (resource: Resource, action: Action) => RequestHandler;
};

export function createHelpRequestModule(
  prismaService: PrismaService,
  auditLogService: AuditLogService,
  guards: HelpRequestModuleGuards,
): Router {
  const service = new HelpRequestService(prismaService, auditLogService);
  const controller = new HelpRequestController(service);
  const policies = createHelpRequestPolicies(service);

  return createHelpRequestRoutes(controller, guards, policies);
}
