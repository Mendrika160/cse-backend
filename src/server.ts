import 'dotenv/config';
import { createApp } from './app';
import { env } from './core/config/env';
import { logger } from './core/logger/logger';
import { createHealthModule } from './modules/health/health.module';
import { createPrismaModule } from './modules/prisma/prisma.module';

async function bootstrap(): Promise<void> {
  const prismaModule = createPrismaModule();
  await prismaModule.connect();

  const healthRouter = createHealthModule();
  const app = createApp({ healthRouter });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `Server running on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down server');
    server.close(async () => {
      await prismaModule.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void bootstrap().catch((error: unknown) => {
  logger.error({ err: error }, 'Bootstrap failed');
  process.exit(1);
});
