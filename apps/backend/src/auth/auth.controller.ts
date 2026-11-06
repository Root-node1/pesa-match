import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { ForbiddenException } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  private setRefreshCookie(res: Response, token: string) {
    const secure = this.config.get<string>('REFRESH_COOKIE_SECURE') === 'true';
    const sameSite = (this.config.get<string>('REFRESH_COOKIE_SAMESITE') ?? 'lax') as
      | 'lax'
      | 'strict'
      | 'none';
    const name = this.config.get<string>('REFRESH_COOKIE_NAME') ?? 'pesa_refresh';
    res.cookie(name, token, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    const name = this.config.get<string>('REFRESH_COOKIE_NAME') ?? 'pesa_refresh';
    res.clearCookie(name, { path: '/api/v1/auth' });
  }

  private checkOrigin(req: Request) {
    const origin = req.headers.origin;
    const allowed = (this.config.get<string>('CORS_ORIGINS') ?? '').split(',').map((s) => s.trim());
    if (origin && !allowed.includes(origin)) {
      throw new ForbiddenException('Invalid origin');
    }
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.checkOrigin(req);
    const result = await this.auth.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _refreshToken, ...rest } = result;
    return { success: true, data: rest };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.checkOrigin(req);
    const result = await this.auth.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _refreshToken, ...rest } = result;
    return { success: true, data: rest };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.checkOrigin(req);
    const name = this.config.get<string>('REFRESH_COOKIE_NAME') ?? 'pesa_refresh';
    const token = (req.cookies as Record<string, string>)?.[name];
    const result = await this.auth.refresh(token, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.setRefreshCookie(res, result.refreshToken);
    return { success: true, data: { accessToken: result.accessToken } };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.checkOrigin(req);
    const name = this.config.get<string>('REFRESH_COOKIE_NAME') ?? 'pesa_refresh';
    const token = (req.cookies as Record<string, string>)?.[name];
    await this.auth.logout(token);
    this.clearRefreshCookie(res);
    return { success: true, data: null };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { sub: string }) {
    const data = await this.auth.me(user.sub);
    return { success: true, data };
  }
}
