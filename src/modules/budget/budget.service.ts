import { ConflictError } from '../../core/errors/conflict-error';
import { NotFoundError } from '../../core/errors/not-found-error';
import type { PrismaClient } from '../../generated/prisma/client';
import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { BudgetResponseDto } from './dto/budget-response.dto';
import type { ListBudgetQueryDto } from './dto/list-budget-query.dto';
import type { UpsertBudgetDto } from './dto/upsert-budget.dto';

const budgetSelect = {
  id: true,
  year: true,
  totalAmount: true,
  remainingAmount: true,
  reservedAmount: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class BudgetService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private get prisma(): PrismaClient {
    return this.prismaService as unknown as PrismaClient;
  }

  async list(
    query: ListBudgetQueryDto,
  ): Promise<{
    items: BudgetResponseDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        orderBy: { year: 'desc' },
        skip,
        take: query.pageSize,
        select: budgetSelect,
      }),
      this.prisma.budget.count(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    return {
      items: rows.map((row) => this.toBudgetResponseDto(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
    };
  }

  async getByYear(year: number): Promise<BudgetResponseDto> {
    const budget = await this.prisma.budget.findUnique({
      where: { year },
      select: budgetSelect,
    });

    if (!budget) {
      throw new NotFoundError(`Budget for year ${year} not found`);
    }

    return this.toBudgetResponseDto(budget);
  }

  async create(input: UpsertBudgetDto, actorId: string): Promise<BudgetResponseDto> {
    const existing = await this.prisma.budget.findUnique({
      where: { year: input.year },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError(`Un budget existe déjà pour l'année ${input.year}.`, {
        businessCode: 'BUDGET_ALREADY_EXISTS',
        year: input.year,
      });
    }

    const created = await this.prisma.budget.create({
      data: {
        year: input.year,
        totalAmount: input.totalAmount,
        remainingAmount: input.totalAmount,
        reservedAmount: 0,
      },
      select: budgetSelect,
    });

    await this.auditLogService.log({
      userId: actorId,
      action: 'BUDGET_CREATED',
      resource: 'BUDGET',
      resourceId: String(created.year),
      metadata: {
        totalAmount: created.totalAmount,
        remainingAmount: created.remainingAmount,
        reservedAmount: created.reservedAmount,
        availableAmount: created.remainingAmount - created.reservedAmount,
      },
    });

    return this.toBudgetResponseDto(created);
  }

  async upsert(input: UpsertBudgetDto, actorId: string): Promise<BudgetResponseDto> {
    const existing = await this.prisma.budget.findUnique({
      where: { year: input.year },
      select: budgetSelect,
    });

    if (!existing) {
      throw new NotFoundError(`Aucun budget trouvé pour l'année ${input.year}.`);
    }

    const spent = existing.totalAmount - existing.remainingAmount;
    const committed = spent + existing.reservedAmount;
    if (input.totalAmount < committed) {
      throw new ConflictError(
        `Le total du budget ne peut pas être inférieur au montant déjà engagé (${committed}).`,
        {
          businessCode: 'BUDGET_TOTAL_BELOW_COMMITTED',
          year: input.year,
          committedAmount: committed,
        },
      );
    }

    const updated = await this.prisma.budget.update({
      where: { year: input.year },
      data: {
        totalAmount: input.totalAmount,
        remainingAmount: input.totalAmount - spent,
      },
      select: budgetSelect,
    });

    await this.auditLogService.log({
      userId: actorId,
      action: 'BUDGET_UPDATED',
      resource: 'BUDGET',
      resourceId: String(updated.year),
      metadata: {
        totalAmount: updated.totalAmount,
        remainingAmount: updated.remainingAmount,
        reservedAmount: updated.reservedAmount,
        availableAmount: updated.remainingAmount - updated.reservedAmount,
      },
    });

    return this.toBudgetResponseDto(updated);
  }

  private toBudgetResponseDto(budget: {
    id: string;
    year: number;
    totalAmount: number;
    remainingAmount: number;
    reservedAmount: number;
    createdAt: Date;
    updatedAt: Date;
  }): BudgetResponseDto {
    return {
      ...budget,
      availableAmount: budget.remainingAmount - budget.reservedAmount,
    };
  }
}
