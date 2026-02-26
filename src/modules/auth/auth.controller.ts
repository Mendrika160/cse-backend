import type { Request, Response } from 'express';
import { env } from '../../core/config/env';
import { UnauthorizedError } from '../../core/errors/unauthorized-error';
import { asyncHandler } from '../../core/http/async-handler';
import { parseLoginDto } from './dto/login.dto';
import { parseRegisterDto } from './dto/register.dto';
import type { AuthService } from './auth.service';

function parseCookieValue(cookieHeader: string | undefined, key: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const entries = cookieHeader.split(';');
  for (const entry of entries) {
    const [rawName, ...rest] = entry.trim().split('=');
    if (rawName === key) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return undefined;
}

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  private getRefreshToken(req: Request): string {
    const refreshToken = parseCookieValue(req.header('cookie'), env.REFRESH_TOKEN_COOKIE_NAME);
    if (!refreshToken) {
      throw new UnauthorizedError('Missing refresh token');
    }

    return refreshToken;
  }

  login = asyncHandler(async (req: Request, res: Response) => {
    const input = parseLoginDto(req.body);
    const result = await this.authService.login(input);
    this.setRefreshCookie(res, result.refreshToken);
    res.status(200).json({
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const input = parseRegisterDto(req.body);
    const result = await this.authService.register(input);
    this.setRefreshCookie(res, result.refreshToken);
    res.status(201).json({
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = this.getRefreshToken(req);
    const session = await this.authService.refreshSession(refreshToken);
    this.setRefreshCookie(res, session.refreshToken);
    res.status(200).json({
      data: {
        accessToken: session.accessToken,
        user: session.user,
      },
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = parseCookieValue(req.header('cookie'), env.REFRESH_TOKEN_COOKIE_NAME);
    await this.authService.logout(refreshToken);
    this.clearRefreshCookie(res);
    res.status(200).json({ data: { ok: true } });
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    res.status(200).json({
      data: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    });
  });

  myPermissions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    res.status(200).json({
      data: {
        userId: req.user.id,
        role: req.user.role,
        permissions: req.user.permissions,
      },
    });
  });
}
