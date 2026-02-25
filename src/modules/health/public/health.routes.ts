import { Router } from 'express';
import { getHealth } from './health.controller';

export function createHealthRoutes(): Router {
  const router = Router();
  router.get('/health', getHealth);
  return router;
}
