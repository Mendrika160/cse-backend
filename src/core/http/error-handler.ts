import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { BadRequestError } from '../errors/bad-request-error';
import { AppError } from '../errors/app-error';
import { logger } from '../logger/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const normalizedError = normalizeError(err);
  const isAppError = normalizedError instanceof AppError;

  const statusCode = isAppError ? normalizedError.statusCode : 500;
  const code = isAppError ? normalizedError.code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError ? normalizedError.message : 'Internal server error';
  const details = isAppError ? normalizedError.details : undefined;
  const stack = env.NODE_ENV === 'production' ? undefined : getStack(normalizedError);

  logger.error({
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    err,
  });

  res.status(statusCode).json({
    error: {
      code,
      message,
      details,
      requestId: req.requestId,
      ...(stack ? { stack } : {}),
    },
  });
}

function normalizeError(err: unknown): unknown {
  if (isInvalidJsonError(err)) {
    return new BadRequestError('Invalid JSON body');
  }
  return err;
}

function isInvalidJsonError(err: unknown): err is Error & { status?: number } {
  return err instanceof SyntaxError && 'status' in err && err.status === 400;
}

function getStack(err: unknown): string | undefined {
  return err instanceof Error ? err.stack : undefined;
}
