import type { RequestHandler, Router } from 'express';
import { Router as createRouter } from 'express';
import type { Action, Resource } from '../../generated/prisma/enums';
import type { HelpRequestController } from './help-request.controller';
import type { HelpRequestPolicies } from './help-request.policy';

type HelpRequestGuards = {
  requireAuth: RequestHandler;
  requirePermission: (resource: Resource, action: Action) => RequestHandler;
};

export function createHelpRequestRoutes(
  controller: HelpRequestController,
  guards: HelpRequestGuards,
  policies: HelpRequestPolicies,
): Router {
  const router = createRouter();

  router.get('/requests', guards.requireAuth, guards.requirePermission('HELP_REQUEST', 'READ'), controller.list);
  router.get(
    '/requests/:id',
    guards.requireAuth,
    guards.requirePermission('HELP_REQUEST', 'READ'),
    policies.loadRequest,
    policies.requireReadScope,
    controller.findById,
  );
  router.post(
    '/requests',
    guards.requireAuth,
    guards.requirePermission('HELP_REQUEST', 'CREATE'),
    policies.requireBeneficiary,
    controller.create,
  );
  router.patch(
    '/requests/:id',
    guards.requireAuth,
    guards.requirePermission('HELP_REQUEST', 'UPDATE'),
    policies.loadRequest,
    policies.requireOwner,
    policies.requireDraft,
    controller.edit,
  );
  router.post(
    '/requests/:id/submit',
    guards.requireAuth,
    guards.requirePermission('HELP_REQUEST', 'SUBMIT'),
    policies.loadRequest,
    policies.requireOwner,
    policies.requireDraft,
    controller.submit,
  );
  router.post(
    '/requests/:id/approve',
    guards.requireAuth,
    guards.requirePermission('HELP_REQUEST', 'APPROVE'),
    policies.loadRequest,
    policies.requireManager,
    policies.requireSubmitted,
    controller.approve,
  );
  router.post(
    '/requests/:id/reject',
    guards.requireAuth,
    guards.requirePermission('HELP_REQUEST', 'REJECT'),
    policies.loadRequest,
    policies.requireManager,
    policies.requireSubmitted,
    controller.reject,
  );
  router.post(
    '/requests/:id/pay',
    guards.requireAuth,
    guards.requirePermission('HELP_REQUEST', 'PAY'),
    policies.loadRequest,
    policies.requireManager,
    policies.requireApproved,
    controller.pay,
  );

  return router;
}
