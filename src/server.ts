import 'dotenv/config';
import { createApp } from './app';
import { env } from './core/config/env';
import { logger } from './core/logger/logger';
import { createAuthModule } from './modules/auth/auth.module';
import { createHealthModule } from './modules/health/health.module';
import { createPrismaModule } from './modules/prisma/prisma.module';
import { createUserModule } from './modules/user/user.module';

async function bootstrap(): Promise<void> {
  const prismaModule = createPrismaModule();
  await prismaModule.connect();

  const healthRouter = createHealthModule();
  const authModule = createAuthModule(prismaModule.prismaService);
  const userRouter = createUserModule(prismaModule.prismaService, {
    requireAuth: authModule.requireAuth,
    requireRole: authModule.requireRole,
    requirePermission: authModule.requirePermission,
    requirePermissionOrSelf: authModule.requirePermissionOrSelf,
  });
  const app = createApp({ healthRouter, authRouter: authModule.router, userRouter });

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
