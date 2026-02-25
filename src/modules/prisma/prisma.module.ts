import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../../core/config/env';
import { PrismaService } from './prisma.service';

export type PrismaModule = {
  prismaService: PrismaService;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export function createPrismaModule(): PrismaModule {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  const prismaService = new PrismaService({ adapter });

  return {
    prismaService,
    connect: () => prismaService.connect(),
    disconnect: () => prismaService.disconnect(),
  };
}
