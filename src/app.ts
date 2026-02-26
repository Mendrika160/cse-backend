import cors from 'cors';
import express, { type Router } from 'express';
import helmet from 'helmet';
import { env } from './core/config/env';
import { errorHandler } from './core/http/error-handler';
import { notFoundMiddleware } from './core/http/not-found';
import { requestIdMiddleware } from './core/http/request-id';

type AppModules = {
  healthRouter: Router;
  authRouter: Router;
  userRouter: Router;
  helpRequestRouter: Router;
  budgetRouter: Router;
};

export function createApp({ healthRouter, authRouter, userRouter, helpRequestRouter, budgetRouter }: AppModules) {
  const app = express();
  const apiRouter = express.Router();
  const corsOrigin =
    env.CORS_ORIGIN === '*'
      ? true
      : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());

  apiRouter.use(healthRouter);
  apiRouter.use(authRouter);
  apiRouter.use(userRouter);
  apiRouter.use(helpRequestRouter);
  apiRouter.use(budgetRouter);
  app.use('/api', apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
