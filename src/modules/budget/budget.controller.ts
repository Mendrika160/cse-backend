import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { UnauthorizedError } from '../../core/errors/unauthorized-error';
import { parseGetBudgetQueryDto } from './dto/get-budget-query.dto';
import { parseListBudgetQueryDto } from './dto/list-budget-query.dto';
import { parseUpsertBudgetDto } from './dto/upsert-budget.dto';
import type { BudgetService } from './budget.service';

export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = parseListBudgetQueryDto(req.query);
    const result = await this.budgetService.list(query);
    res.status(200).json({
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const query = parseGetBudgetQueryDto(req.query);
    const data = await this.budgetService.getByYear(query.year);
    res.status(200).json({ data });
  });

  upsert = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const input = parseUpsertBudgetDto(req.body);
    const data = await this.budgetService.upsert(input, req.user.id);
    res.status(200).json({ data });
  });
}
