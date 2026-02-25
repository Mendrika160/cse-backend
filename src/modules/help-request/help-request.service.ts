import { ConflictError } from '../../core/errors/conflict-error';
import { NotFoundError } from '../../core/errors/not-found-error';
import type { PrismaClient } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.service';
import type { CreateHelpRequestDto } from './dto/create-help-request.dto';
import type { EditHelpRequestDto } from './dto/edit-help-request.dto';
import type { HelpRequestResponseDto } from './dto/help-request-response.dto';

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
  constructor(private readonly prismaService: PrismaService) {}

  private get prisma(): PrismaClient {
    return this.prismaService as unknown as PrismaClient;
  }

  async list(actor: AuthenticatedUser): Promise<HelpRequestResponseDto[]> {
    const rows = await this.prisma.helpRequest.findMany({
      where: actor.role === 'BENEFICIARY' ? { beneficiaryId: actor.id } : undefined,
      select: helpRequestSelect,
      orderBy: { createdAt: 'desc' },
    });

    return rows;
  }

  async createForBeneficiary(
    beneficiaryId: string,
    input: CreateHelpRequestDto,
  ): Promise<HelpRequestResponseDto> {
    return this.prisma.helpRequest.create({
      data: {
        beneficiaryId,
        type: input.type,
        amount: input.amount,
        description: input.description,
      },
      select: helpRequestSelect,
    });
  }

  async edit(id: string, input: EditHelpRequestDto): Promise<HelpRequestResponseDto> {
    return this.prisma.helpRequest.update({
      where: { id },
      data: {
        type: input.type,
        amount: input.amount,
        description: input.description,
      },
      select: helpRequestSelect,
    });
  }

  async submit(id: string): Promise<HelpRequestResponseDto> {
    return this.prisma.helpRequest.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      select: helpRequestSelect,
    });
  }

  async approve(id: string, managerId: string): Promise<HelpRequestResponseDto> {
    const request = await this.findByIdOrThrow(id);
    if (request.status !== 'SUBMITTED') {
      throw new ConflictError('Only SUBMITTED requests can be approved');
    }

    await this.ensureBudgetCanCover(request);
    return this.transitionByManager(id, managerId, 'APPROVED');
  }

  async reject(id: string, managerId: string): Promise<HelpRequestResponseDto> {
    return this.transitionByManager(id, managerId, 'REJECTED');
  }

  async pay(id: string, managerId: string): Promise<HelpRequestResponseDto> {
    return this.prisma.$transaction(async (tx) => {
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
