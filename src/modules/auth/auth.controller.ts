import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { parseLoginDto } from './dto/login.dto';
import { parseRegisterDto } from './dto/register.dto';
import type { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = asyncHandler(async (req: Request, res: Response) => {
    const input = parseLoginDto(req.body);
    const result = await this.authService.login(input);
    res.status(200).json({ data: result });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const input = parseRegisterDto(req.body);
    const result = await this.authService.register(input);
    res.status(201).json({ data: result });
  });
}
