import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const value = req.header('x-request-id');
  req.requestId = value && value.trim() ? value : randomUUID();
  next();
}
