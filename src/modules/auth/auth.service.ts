import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../../core/config/env';
import { ConflictError } from '../../core/errors/conflict-error';
import { UnauthorizedError } from '../../core/errors/unauthorized-error';
import type { Role } from '../../generated/prisma/enums';
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

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const user = await this.prismaService.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return {
      accessToken: this.createAccessToken(user.id, user.email, user.role),
      user,
    };
  }

  async login(input: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        role: true,
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
      accessToken: this.createAccessToken(user.id, user.email, user.role),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  private createAccessToken(userId: string, email: string, role: Role): string {
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
