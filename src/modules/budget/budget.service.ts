import { ConflictError } from '../../core/errors/conflict-error';
import { NotFoundError } from '../../core/errors/not-found-error';
import type { PrismaClient } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { BudgetResponseDto } from './dto/budget-response.dto';
import type { UpsertBudgetDto } from './dto/upsert-budget.dto';

const budgetSelect = {
  id: true,
  year: true,
  totalAmount: true,
  remainingAmount: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class BudgetService {
  constructor(private readonly prismaService: PrismaService) {}

  private get prisma(): PrismaClient {
    return this.prismaService as unknown as PrismaClient;
  }

  async getByYear(year: number): Promise<BudgetResponseDto> {
    const budget = await this.prisma.budget.findUnique({
      where: { year },
      select: budgetSelect,
    });

    if (!budget) {
      throw new NotFoundError(`Budget for year ${year} not found`);
    }

    return budget;
  }

  async upsert(input: UpsertBudgetDto): Promise<BudgetResponseDto> {
    const existing = await this.prisma.budget.findUnique({
      where: { year: input.year },
      select: budgetSelect,
    });

    if (!existing) {
      return this.prisma.budget.create({
        data: {
          year: input.year,
          totalAmount: input.totalAmount,
          remainingAmount: input.totalAmount,
        },
        select: budgetSelect,
      });
    }

    const spent = existing.totalAmount - existing.remainingAmount;
    if (input.totalAmount < spent) {
      throw new ConflictError(
        `Cannot set totalAmount below already consumed amount (${spent}) for year ${input.year}`,
      );
    }

    return this.prisma.budget.update({
      where: { year: input.year },
      data: {
        totalAmount: input.totalAmount,
        remainingAmount: input.totalAmount - spent,
      },
      select: budgetSelect,
    });
  }
}
