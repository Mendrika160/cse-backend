import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ForbiddenError } from '../../core/errors/forbidden-error';
import { UnauthorizedError } from '../../core/errors/unauthorized-error';
import type { Action, Resource, UserRole } from '../../generated/prisma/enums';
import type { AuthService } from './auth.service';

type OwnerIdResolver = (req: Request) => string | undefined;

export function createRequireAuth(authService: AuthService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.header('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid authorization header');
      }

      const token = authHeader.slice('Bearer '.length).trim();
      if (!token) {
        throw new UnauthorizedError('Missing bearer token');
      }

      req.user = await authService.authenticateAccessToken(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createRequirePermission(resource: Resource, action: Action): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const hasPermission = req.user.permissions.some(
      (permission) => permission.resource === resource && permission.action === action,
    );

    if (!hasPermission) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}

export function createRequireRole(role: UserRole): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (req.user.role !== role) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}

export function createRequirePermissionOrSelf(
  resource: Resource,
  action: Action,
  resolveOwnerId: OwnerIdResolver,
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const ownerId = resolveOwnerId(req);
    if (ownerId && ownerId === req.user.id) {
      next();
      return;
    }

    const hasPermission = req.user.permissions.some(
      (permission) => permission.resource === resource && permission.action === action,
    );

    if (!hasPermission) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}
