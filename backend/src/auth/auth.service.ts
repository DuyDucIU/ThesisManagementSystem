import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { lecturer: true, student: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.username,
      user.role,
    );

    return {
      accessToken,
      refreshToken,
      user: this.buildProfile(user),
    };
  }

  async refresh(token: string) {
    let payload: { sub: number; jti: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenValid = await bcrypt.compare(payload.jti, user.refreshToken);
    if (!tokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.username,
      user.role,
    );

    return { accessToken, refreshToken };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { lecturer: true, student: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildProfile(user);
  }

  private async generateTokens(userId: number, username: string, role: Role) {
    const jti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, username, role },
        { expiresIn: this.configService.get('JWT_EXPIRY', '30m') },
      ),
      this.jwtService.signAsync(
        { sub: userId, jti },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d'),
        },
      ),
    ]);

    const hashedJti = await bcrypt.hash(jti, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedJti },
    });

    return { accessToken, refreshToken };
  }

  private buildProfile(user: any) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.lecturer?.fullName ?? user.student?.fullName ?? null,
      email: user.lecturer?.email ?? user.student?.email ?? null,
    };
  }
}
