import 'dotenv/config';
import { createApp } from './app';
import { env } from './core/config/env';
import { logger } from './core/logger/logger';
import { createHealthModule } from './modules/health/health.module';

function bootstrap(): void {
  const healthRouter = createHealthModule();
  const app = createApp({ healthRouter });

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `Server running on http://localhost:${env.PORT}`);
  });
}

bootstrap();
