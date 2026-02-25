import type { Prisma } from '../../generated/prisma/client';
import type { Resource } from '../../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';

export type AuditLogInput = {
  userId: string;
  action: string;
  resource: Resource;
  resourceId: string;
  metadata?: Prisma.InputJsonValue;
};

export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

 

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: input.metadata,
      },
    });
  }
}
