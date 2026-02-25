import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { parseGetBudgetQueryDto } from './dto/get-budget-query.dto';
import { parseUpsertBudgetDto } from './dto/upsert-budget.dto';
import type { BudgetService } from './budget.service';

export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  get = asyncHandler(async (req: Request, res: Response) => {
    const query = parseGetBudgetQueryDto(req.query);
    const data = await this.budgetService.getByYear(query.year);
    res.status(200).json({ data });
  });

  upsert = asyncHandler(async (req: Request, res: Response) => {
    const input = parseUpsertBudgetDto(req.body);
    const data = await this.budgetService.upsert(input);
    res.status(200).json({ data });
  });
}
