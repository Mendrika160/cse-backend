import { Router } from 'express';
import type { PrismaService } from '../prisma/prisma.service';
import { UserController } from './user.controller';
import { createUserRoutes } from './user.routes';
import { UserService } from './user.service';

export function createUserModule(prismaService: PrismaService): Router {
  const userService = new UserService(prismaService);
  const userController = new UserController(userService);

  return createUserRoutes(userController);
}
