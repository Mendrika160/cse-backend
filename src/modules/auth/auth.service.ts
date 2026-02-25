import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../../core/config/env';
import { BadRequestError } from '../../core/errors/bad-request-error';
import { ConflictError } from '../../core/errors/conflict-error';
import { UnauthorizedError } from '../../core/errors/unauthorized-error';
import type { UserRole } from '../../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { LoginResponseDto } from './dto/login-response.dto';
import type { RegisterDto } from './dto/register.dto';

const PASSWORD_SALT_ROUNDS = 10;

export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}

  async register(input: RegisterDto): Promise<LoginResponseDto> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictError('Email already exists');
    }

    const roleId = await this.resolveRoleId(input.role);
    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const user = await this.prismaService.user.create({
      data: {
        email: input.email,
        passwordHash,
        roleId,
      },
      select: {
        id: true,
        email: true,
        role: {
          select: {
            code: true,
          },
        },
      },
    });

    return {
      accessToken: this.createAccessToken(user.id, user.email, user.role.code),
      user: {
        id: user.id,
        email: user.email,
        role: user.role.code,
      },
    };
  }

  async login(input: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        role: {
          select: {
            code: true,
          },
        },
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return {
      accessToken: this.createAccessToken(user.id, user.email, user.role.code),
      user: {
        id: user.id,
        email: user.email,
        role: user.role.code,
      },
    };
  }

  private async resolveRoleId(roleCode: UserRole): Promise<string> {
    const role = await this.prismaService.role.findUnique({
      where: { code: roleCode },
      select: { id: true },
    });

    if (!role) {
      throw new BadRequestError(`Role "${roleCode}" is not configured`);
    }

    return role.id;
  }

  private createAccessToken(userId: string, email: string, role: UserRole): string {
    const options: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };

    return jwt.sign(
      {
        sub: userId,
        email,
        role,
      },
      env.JWT_SECRET,
      options,
    );
  }
}
