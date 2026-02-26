import type { RequestHandler } from 'express';
import { Router } from 'express';
import type { AuthController } from './auth.controller';

type AuthRouteGuards = {
  requireAuth: RequestHandler;
};

export function createAuthRoutes(controller: AuthController, guards: AuthRouteGuards): Router {
  const router = Router();

  router.post('/auth/login', controller.login);
  router.post('/auth/refresh', controller.refresh);
  router.post('/auth/logout', controller.logout);
  router.get('/me', guards.requireAuth, controller.me);
  router.get('/me/permissions', guards.requireAuth, controller.myPermissions);

  return router;
}
