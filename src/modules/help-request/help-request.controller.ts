import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../core/errors/unauthorized-error';
import { asyncHandler } from '../../core/http/async-handler';
import { parseCreateHelpRequestDto } from './dto/create-help-request.dto';
import { parseEditHelpRequestDto } from './dto/edit-help-request.dto';
import type { HelpRequestService } from './help-request.service';

export class HelpRequestController {
  constructor(private readonly helpRequestService: HelpRequestService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const data = await this.helpRequestService.list(req.user);
    res.status(200).json({ data });
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.helpRequest) {
      throw new UnauthorizedError('Help request context is missing');
    }

    res.status(200).json({ data: req.helpRequest });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = parseCreateHelpRequestDto(req.body);
    const data = await this.helpRequestService.createForBeneficiary(req.user.id, payload);
    res.status(201).json({ data });
  });

  edit = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.helpRequest) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = parseEditHelpRequestDto(req.body);
    const data = await this.helpRequestService.edit(req.helpRequest.id, payload, req.user.id);
    res.status(200).json({ data });
  });

  submit = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.helpRequest) {
      throw new UnauthorizedError('Authentication required');
    }

    const data = await this.helpRequestService.submit(req.helpRequest.id, req.user.id);
    res.status(200).json({ data });
  });

  approve = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.helpRequest) {
      throw new UnauthorizedError('Authentication required');
    }

    const data = await this.helpRequestService.approve(req.helpRequest.id, req.user.id);
    res.status(200).json({ data });
  });

  reject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.helpRequest) {
      throw new UnauthorizedError('Authentication required');
    }

    const data = await this.helpRequestService.reject(req.helpRequest.id, req.user.id);
    res.status(200).json({ data });
  });

  pay = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.helpRequest) {
      throw new UnauthorizedError('Authentication required');
    }

    const data = await this.helpRequestService.pay(req.helpRequest.id, req.user.id);
    res.status(200).json({ data });
  });
}
