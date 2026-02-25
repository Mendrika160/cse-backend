import { Router } from 'express';
import { createHealthRoutes } from './public/health.routes';

export function createHealthModule(): Router {
  return createHealthRoutes();
}
