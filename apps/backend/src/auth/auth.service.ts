import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service.js';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private accessSecret() {
    return this.config.get<string>('JWT_ACCESS_SECRET')!;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const { user, organization } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });
      const organization = await tx.organization.create({
        data: { name: dto.organizationName },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: 'OWNER' },
      });
      return { user, organization };
    });
    const tokens = await this.issueTokens(user.id, user.email);
    await this.createRefreshSession(user.id, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
      organizationId: organization.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const membership = await this.prisma.membership.findFirst({ where: { userId: user.id } });
    const tokens = await this.issueTokens(user.id, user.email);
    await this.createRefreshSession(user.id, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
      organizationId: membership?.organizationId ?? null,
    };
  }

  async refresh(refreshToken: string | undefined, meta: { userAgent?: string; ip?: string }) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    // rotate
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens(user.id, user.email);
    await this.createRefreshSession(user.id, tokens.refreshToken, meta);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { organization: true } } },
    });
    if (!user) throw new UnauthorizedException();
    return {
      user: this.sanitizeUser(user),
      memberships: user.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        organization: { id: m.organization.id, name: m.organization.name, currency: m.organization.currency },
      })),
    };
  }

  async issueTokens(userId: string, email: string) {
    const expiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      { secret: this.accessSecret(), expiresIn: expiresIn as any },
    );
    const refreshToken = crypto.randomBytes(64).toString('hex');
    return { accessToken, refreshToken };
  }

  async createRefreshSession(userId: string, refreshToken: string, meta?: { userAgent?: string; ip?: string }) {
    const days = Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? '30');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        userAgent: meta?.userAgent ?? null,
        ipAddress: meta?.ip ?? null,
      },
    });
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: { id: string; email: string; firstName: string | null; lastName: string | null; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    };
  }
}
