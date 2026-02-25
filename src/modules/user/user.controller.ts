import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/async-handler';
import { parseCreateUserDto } from './dto/create-user.dto';
import { parseEditUserDto } from './dto/edit-user.dto';
import { parseFindUserByEmailDto } from './dto/find-user-by-email.dto';
import { parseUserIdParamDto } from './dto/user-id-param.dto';
import type { UserService } from './user.service';

export class UserController {
  constructor(private readonly userService: UserService) {}

  findById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseUserIdParamDto(req.params);
    const user = await this.userService.findById(id);
    res.status(200).json({ data: user });
  });

  findByEmail = asyncHandler(async (req: Request, res: Response) => {
    const query = parseFindUserByEmailDto(req.query);
    const user = await this.userService.findByEmail(query.email);
    res.status(200).json({ data: user });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const input = parseCreateUserDto(req.body);
    const user = await this.userService.create(input);
    res.status(201).json({ data: user });
  });

  edit = asyncHandler(async (req: Request, res: Response) => {
    const id = parseUserIdParamDto(req.params);
    const input = parseEditUserDto(req.body);
    const user = await this.userService.edit(id, input);
    res.status(200).json({ data: user });
  });
}
