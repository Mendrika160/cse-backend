import bcrypt from 'bcrypt';
import { BadRequestError } from '../../core/errors/bad-request-error';
import { ConflictError } from '../../core/errors/conflict-error';
import { ForbiddenError } from '../../core/errors/forbidden-error';
import { NotFoundError } from '../../core/errors/not-found-error';
import type { UserRole } from '../../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { EditUserDto } from './dto/edit-user.dto';
import type { UserResponseDto } from './dto/user-response.dto';

const PASSWORD_SALT_ROUNDS = 10;

const userResponseSelect = {
  id: true,
  email: true,
  role: {
    select: {
      code: true,
    },
  },
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

    return this.toUserResponseDto(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: userResponseSelect,
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.toUserResponseDto(user);
  }

  async create(input: CreateUserDto, actor: AuthenticatedUser): Promise<UserResponseDto> {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenError('Only ADMIN can create users from this endpoint');
    }
    if (input.role !== 'BENEFICIARY') {
      throw new BadRequestError('Only BENEFICIARY can be created from this endpoint');
    }

    const existingUser = await this.prismaService.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictError('Email already exists');
    }

    const roleId = await this.resolveRoleId(input.role);
    const passwordHash = await this.hashPassword(input.password);

    const user = await this.prismaService.user.create({
      data: {
        email: input.email,
        passwordHash,
        roleId,
      },
      select: userResponseSelect,
    });

    return this.toUserResponseDto(user);
  }

  async edit(id: string, input: EditUserDto, actor: AuthenticatedUser): Promise<UserResponseDto> {
    const existingById = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!existingById) {
      throw new NotFoundError('User not found');
    }

    const isSelfUpdate = id === actor.id;
    if (isSelfUpdate && input.role && actor.role !== 'ADMIN') {
      throw new ForbiddenError('You cannot change your own role');
    }

    const isAdminUpdatingAnotherUser = actor.role === 'ADMIN' && !isSelfUpdate;
    if (isAdminUpdatingAnotherUser && existingById.role.code !== 'BENEFICIARY') {
      throw new ForbiddenError('ADMIN can only update BENEFICIARY users from this endpoint');
    }

    if (isAdminUpdatingAnotherUser && input.role && input.role !== 'BENEFICIARY') {
      throw new BadRequestError('ADMIN can only assign BENEFICIARY role from this endpoint');
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
    const roleId = input.role ? await this.resolveRoleId(input.role) : undefined;

    const user = await this.prismaService.user.update({
      where: { id },
      data: {
        email: input.email,
        passwordHash,
        roleId,
      },
      select: userResponseSelect,
    });

    return this.toUserResponseDto(user);
  }

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
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

  private toUserResponseDto(user: {
    id: string;
    email: string;
    role: { code: UserRole };
    createdAt: Date;
    updatedAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role.code,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
