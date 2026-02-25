import { Router } from 'express';
import { HealthController } from './health.controller';
import { createHealthRoutes } from './health.routes';
import { HealthService } from './health.service';

export function createHealthModule(): Router {
  const healthService = new HealthService();
  const healthController = new HealthController(healthService);

  return createHealthRoutes(healthController);
}
