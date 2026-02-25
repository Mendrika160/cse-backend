import 'dotenv/config';
import { createApp } from './app';
import { env } from './core/config/env';
import { logger } from './core/logger/logger';
import { AuditLogService } from './modules/audit-log/audit-log.service';
import { createAuthModule } from './modules/auth/auth.module';
import { createBudgetModule } from './modules/budget/budget.module';
import { createHealthModule } from './modules/health/health.module';
import { createHelpRequestModule } from './modules/help-request/help-request.module';
import { createPrismaModule } from './modules/prisma/prisma.module';
import { createUserModule } from './modules/user/user.module';

async function bootstrap(): Promise<void> {
  const prismaModule = createPrismaModule();
  await prismaModule.connect();
  const auditLogService = new AuditLogService(prismaModule.prismaService);

  const healthRouter = createHealthModule();
  const authModule = createAuthModule(prismaModule.prismaService, auditLogService);
  const userRouter = createUserModule(prismaModule.prismaService, auditLogService, {
    requireAuth: authModule.requireAuth,
    requireRole: authModule.requireRole,
    requirePermission: authModule.requirePermission,
    requirePermissionOrSelf: authModule.requirePermissionOrSelf,
  });
  const helpRequestRouter = createHelpRequestModule(prismaModule.prismaService, auditLogService, {
    requireAuth: authModule.requireAuth,
    requirePermission: authModule.requirePermission,
  });
  const budgetRouter = createBudgetModule(prismaModule.prismaService, auditLogService, {
    requireAuth: authModule.requireAuth,
    requireRole: authModule.requireRole,
    requirePermission: authModule.requirePermission,
  });
  const app = createApp({
    healthRouter,
    authRouter: authModule.router,
    userRouter,
    helpRequestRouter,
    budgetRouter,
  });

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
