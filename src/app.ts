import cors from 'cors';
import express, { type Router } from 'express';
import helmet from 'helmet';
import { errorHandler } from './core/http/error-handler';
import { notFoundMiddleware } from './core/http/not-found';
import { requestIdMiddleware } from './core/http/request-id';

type AppModules = {
  healthRouter: Router;
  authRouter: Router;
  userRouter: Router;
  helpRequestRouter: Router;
};

export function createApp({ healthRouter, authRouter, userRouter, helpRequestRouter }: AppModules) {
  const app = express();
  const apiRouter = express.Router();

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  apiRouter.use(healthRouter);
  apiRouter.use(authRouter);
  apiRouter.use(userRouter);
  apiRouter.use(helpRequestRouter);
  app.use('/api', apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
