import type { Prisma } from '../../generated/prisma/client';
import { PrismaClient } from '../../generated/prisma/client';
import { logger } from '../../core/logger/logger';

export class PrismaService extends PrismaClient {
  constructor(options: Prisma.PrismaClientOptions) {
    super(options);
  }

  async connect(): Promise<void> {
    await this.$connect();
    logger.info({ event: 'prisma_connected' }, 'Prisma connected');
  }

  async disconnect(): Promise<void> {
    await this.$disconnect();
    logger.info({ event: 'prisma_disconnected' }, 'Prisma disconnected');
  }
}
