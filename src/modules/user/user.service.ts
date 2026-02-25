import bcrypt from 'bcrypt';
import { ConflictError } from '../../core/errors/conflict-error';
import { NotFoundError } from '../../core/errors/not-found-error';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { EditUserDto } from './dto/edit-user.dto';
import type { UserResponseDto } from './dto/user-response.dto';

const PASSWORD_SALT_ROUNDS = 10;

const userResponseSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: userResponseSelect,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: userResponseSelect,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async create(input: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictError('Email already exists');
    }

    const passwordHash = await this.hashPassword(input.password);

    return this.prismaService.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: userResponseSelect,
    });
  }

  async edit(id: string, input: EditUserDto): Promise<UserResponseDto> {
    const existingById = await this.prismaService.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingById) {
      throw new NotFoundError('User not found');
    }

    if (input.email) {
      const existingByEmail = await this.prismaService.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictError('Email already exists');
      }
    }

    const passwordHash = input.password
      ? await this.hashPassword(input.password)
      : undefined;

    return this.prismaService.user.update({
      where: { id },
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: userResponseSelect,
    });
  }

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }
}
