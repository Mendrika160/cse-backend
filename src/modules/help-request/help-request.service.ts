import { ConflictError } from '../../core/errors/conflict-error';
import { NotFoundError } from '../../core/errors/not-found-error';
import type { PrismaClient } from '../../generated/prisma/client';
import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.service';
import type { CreateHelpRequestDto } from './dto/create-help-request.dto';
import type { EditHelpRequestDto } from './dto/edit-help-request.dto';
import type { HelpRequestResponseDto } from './dto/help-request-response.dto';
import type { ListHelpRequestQueryDto } from './dto/list-help-request-query.dto';

const helpRequestSelect = {
  id: true,
  beneficiaryId: true,
  managerId: true,
  type: true,
  amount: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class HelpRequestService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private get prisma(): PrismaClient {
    return this.prismaService as unknown as PrismaClient;
  }

  async list(
    actor: AuthenticatedUser,
    query: ListHelpRequestQueryDto,
  ): Promise<{
    items: HelpRequestResponseDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const where = actor.role === 'BENEFICIARY' ? { beneficiaryId: actor.id } : undefined;
    const skip = (query.page - 1) * query.pageSize;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.helpRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
        select: {
          ...helpRequestSelect,
          beneficiary: { select: { id: true,email: true } },
          manager: { select: { id: true, email: true } },
        },
      }),
      this.prisma.helpRequest.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

    return {
      items: rows,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
    };
  }

  async createForBeneficiary(
    beneficiaryId: string,
    input: CreateHelpRequestDto,
  ): Promise<HelpRequestResponseDto> {
    const request = await this.prisma.helpRequest.create({
      data: {
        beneficiaryId,
        type: input.type,
        amount: input.amount,
        description: input.description,
      },
      select: helpRequestSelect,
    });

    await this.auditLogService.log({
      userId: beneficiaryId,
      action: 'HELP_REQUEST_CREATED',
      resource: 'HELP_REQUEST',
      resourceId: request.id,
    });

    return request;
  }

  async edit(id: string, input: EditHelpRequestDto, actorId: string): Promise<HelpRequestResponseDto> {
    const request = await this.prisma.helpRequest.update({
      where: { id },
      data: {
        type: input.type,
        amount: input.amount,
        description: input.description,
      },
      select: helpRequestSelect,
    });

    await this.auditLogService.log({
      userId: actorId,
      action: 'HELP_REQUEST_UPDATED',
      resource: 'HELP_REQUEST',
      resourceId: request.id,
    });

    return request;
  }

  async submit(id: string, actorId: string): Promise<HelpRequestResponseDto> {
    const request = await this.prisma.helpRequest.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      select: helpRequestSelect,
    });

    await this.auditLogService.log({
      userId: actorId,
      action: 'HELP_REQUEST_SUBMITTED',
      resource: 'HELP_REQUEST',
      resourceId: request.id,
    });

    return request;
  }

  async approve(id: string, managerId: string): Promise<HelpRequestResponseDto> {
    const request = await this.findByIdOrThrow(id);
    if (request.status !== 'SUBMITTED') {
      throw new ConflictError('Only SUBMITTED requests can be approved');
    }

    await this.ensureBudgetCanCover(request);
    const updated = await this.transitionByManager(id, managerId, 'APPROVED');
    await this.auditLogService.log({
      userId: managerId,
      action: 'HELP_REQUEST_APPROVED',
      resource: 'HELP_REQUEST',
      resourceId: updated.id,
    });

    return updated;
  }

  async reject(id: string, managerId: string): Promise<HelpRequestResponseDto> {
    const updated = await this.transitionByManager(id, managerId, 'REJECTED');
    await this.auditLogService.log({
      userId: managerId,
      action: 'HELP_REQUEST_REJECTED',
      resource: 'HELP_REQUEST',
      resourceId: updated.id,
    });

    return updated;
  }

  async pay(id: string, managerId: string): Promise<HelpRequestResponseDto> {
    const paidRequest = await this.prisma.$transaction(async (tx) => {
      const request = await tx.helpRequest.findUnique({
        where: { id },
        select: helpRequestSelect,
      });

      if (!request) {
        throw new NotFoundError('Help request not found');
      }
      if (request.status !== 'APPROVED') {
        throw new ConflictError('Only APPROVED requests can be paid');
      }

      const budgetYear = this.resolveBudgetYear(request.createdAt);
      const budgetUpdate = await tx.budget.updateMany({
        where: {
          year: budgetYear,
          remainingAmount: { gte: request.amount },
        },
        data: {
          remainingAmount: { decrement: request.amount },
        },
      });

      if (budgetUpdate.count !== 1) {
        throw new ConflictError(`Insufficient budget for year ${budgetYear}`);
      }

      const requestUpdate = await tx.helpRequest.updateMany({
        where: {
          id,
          status: 'APPROVED',
        },
        data: {
          status: 'PAID',
          managerId,
        },
      });

      if (requestUpdate.count !== 1) {
        throw new ConflictError('Request status changed during payment');
      }

      const paidRequest = await tx.helpRequest.findUnique({
        where: { id },
        select: helpRequestSelect,
      });

      if (!paidRequest) {
        throw new NotFoundError('Help request not found after payment');
      }

      return paidRequest;
    });

    await this.auditLogService.log({
      userId: managerId,
      action: 'HELP_REQUEST_PAID',
      resource: 'HELP_REQUEST',
      resourceId: paidRequest.id,
    });

    return paidRequest;
  }

  private async transitionByManager(
    id: string,
    managerId: string,
    targetStatus: 'APPROVED' | 'REJECTED',
  ): Promise<HelpRequestResponseDto> {
    const updated = await this.prisma.helpRequest.updateMany({
      where: {
        id,
        status: 'SUBMITTED',
      },
      data: {
        status: targetStatus,
        managerId,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictError('Only SUBMITTED requests can be approved/rejected');
    }

    const request = await this.prisma.helpRequest.findUnique({
      where: { id },
      select: helpRequestSelect,
    });

    if (!request) {
      throw new NotFoundError('Help request not found');
    }

    return request;
  }

  async findByIdOrThrow(id: string): Promise<HelpRequestResponseDto> {
    const request = await this.prisma.helpRequest.findUnique({
      where: { id },
      select: helpRequestSelect,
    });

    if (!request) {
      throw new NotFoundError('Help request not found');
    }

    return request;
  }

  private async ensureBudgetCanCover(request: HelpRequestResponseDto): Promise<void> {
    const budgetYear = this.resolveBudgetYear(request.createdAt);

    const budget = await this.prisma.budget.findUnique({
      where: { year: budgetYear },
      select: { remainingAmount: true },
    });

    if (!budget) {
      throw new ConflictError(`Budget for year ${budgetYear} is not configured`);
    }

    if (budget.remainingAmount < request.amount) {
      throw new ConflictError(`Insufficient budget for year ${budgetYear}`);
    }
  }

  private resolveBudgetYear(createdAt: Date): number {
    return createdAt.getUTCFullYear();
  }
}
