import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../../core/config/env';
import { BadRequestError } from '../../core/errors/bad-request-error';
import { ConflictError } from '../../core/errors/conflict-error';
import { UnauthorizedError } from '../../core/errors/unauthorized-error';
import type { Action, Resource, UserRole } from '../../generated/prisma/enums';
import type { AuditLogService } from '../audit-log/audit-log.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { LoginResponseDto } from './dto/login-response.dto';
import type { RegisterDto } from './dto/register.dto';

const PASSWORD_SALT_ROUNDS = 10;

type TokenPayload = JwtPayload & {
  sub: string;
  tokenType?: 'access' | 'refresh';
};

type UserIdentity = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuthPermission = {
  resource: Resource;
  action: Action;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  permissions: AuthPermission[];
};

export type AuthSession = LoginResponseDto & {
  refreshToken: string;
};

export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async register(input: RegisterDto): Promise<AuthSession> {
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

    const session = this.createSession(user.id, user.email, user.role.code);
    await this.auditLogService.log({
      userId: session.user.id,
      action: 'AUTH_REGISTER',
      resource: 'USER',
      resourceId: session.user.id,
      metadata: {
        role: session.user.role,
      },
    });

    return session;
  }

  async login(input: LoginDto): Promise<AuthSession> {
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

    const session = this.createSession(user.id, user.email, user.role.code);
    await this.auditLogService.log({
      userId: session.user.id,
      action: 'AUTH_LOGIN',
      resource: 'USER',
      resourceId: session.user.id,
    });

    return session;
  }

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    const payload = this.verifyRefreshToken(refreshToken);
    const user = await this.findIdentityById(payload.sub);

    const session = this.createSession(user.id, user.email, user.role);
    await this.auditLogService.log({
      userId: user.id,
      action: 'AUTH_REFRESH',
      resource: 'USER',
      resourceId: user.id,
    });

    return session;
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = this.verifyRefreshToken(refreshToken);
      await this.auditLogService.log({
        userId: payload.sub,
        action: 'AUTH_LOGOUT',
        resource: 'USER',
        resourceId: payload.sub,
      });
    } catch {
      // Best effort.
    }
  }

  async authenticateAccessToken(token: string): Promise<AuthenticatedUser> {
    const payload = this.verifyAccessToken(token);

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: {
          select: {
            code: true,
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    resource: true,
                    action: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid token');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.code,
      permissions: user.role.rolePermissions.map((entry) => ({
        resource: entry.permission.resource,
        action: entry.permission.action,
      })),
    };
  }

  private createSession(userId: string, email: string, role: UserRole): AuthSession {
    return {
      accessToken: this.createAccessToken(userId, email, role),
      refreshToken: this.createRefreshToken(userId, email, role),
      user: {
        id: userId,
        email,
        role,
      },
    };
  }

  private async findIdentityById(id: string): Promise<UserIdentity> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
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

    if (!user) {
      throw new UnauthorizedError('Invalid token');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.code,
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
        tokenType: 'access',
      },
      env.JWT_SECRET,
      options,
    );
  }

  private createRefreshToken(userId: string, email: string, role: UserRole): string {
    const options: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    };

    return jwt.sign(
      {
        sub: userId,
        email,
        role,
        tokenType: 'refresh',
      },
      env.JWT_REFRESH_SECRET,
      options,
    );
  }

  private verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
        throw new UnauthorizedError('Invalid token payload');
      }

      if (decoded.tokenType && decoded.tokenType !== 'access') {
        throw new UnauthorizedError('Invalid access token');
      }

      return decoded as TokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  private verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
      if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
        throw new UnauthorizedError('Invalid refresh token payload');
      }

      if (decoded.tokenType !== 'refresh') {
        throw new UnauthorizedError('Invalid refresh token');
      }

      return decoded as TokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }
}
