import { Router } from 'express';
import type { UserController } from './user.controller';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  router.get('/users/by-email', controller.findByEmail);
  router.get('/users/:id', controller.findById);
  router.post('/users', controller.create);
  router.patch('/users/:id', controller.edit);

  return router;
}
