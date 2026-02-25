import { Router } from 'express';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { createAuthRoutes } from './auth.routes';
import { AuthService } from './auth.service';

export function createAuthModule(prismaService: PrismaService): Router {
  const authService = new AuthService(prismaService);
  const authController = new AuthController(authService);

  return createAuthRoutes(authController);
}
