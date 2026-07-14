import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

type JwtPayload = {
  sub: string;
  email: string;
  role?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email, true);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const tokens = await this.generateTokens(user);

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const user = await this.usersService.findOne(payload.sub);

    const userWithToken = await this.usersService.findByEmail(
      user.email,
      true,
    );

    if (!userWithToken?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const isRefreshValid = await bcrypt.compare(
      refreshToken,
      userWithToken.refreshTokenHash,
    );

    if (!isRefreshValid) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const tokens = await this.generateTokens(userWithToken);

    await this.usersService.updateRefreshToken(
      userWithToken.id,
      tokens.refreshToken,
    );

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, undefined);
    return { loggedOut: true };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    /**
     * Important sécurité :
     * On retourne toujours le même message pour ne pas révéler
     * si l'email existe ou non.
     */
    const genericResponse = {
      message:
        'Si cet email existe, un lien de réinitialisation a été généré.',
    };

    if (!user || !user.isActive) {
      return genericResponse;
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = this.hashResetToken(resetToken);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await this.usersService.setPasswordResetToken(
      user.id,
      resetTokenHash,
      expiresAt,
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    /**
     * En production, il faudra envoyer ce lien par email.
     * En développement, on retourne le lien pour tester immédiatement.
     */
    return {
      ...genericResponse,
      resetLink:
        process.env.NODE_ENV === 'production' ? undefined : resetLink,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashResetToken(token);

    const user = await this.usersService.findByPasswordResetTokenHash(tokenHash);

    if (!user || !user.passwordResetExpiresAt) {
      throw new UnauthorizedException('Lien de réinitialisation invalide');
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Lien de réinitialisation expiré');
    }

    await this.usersService.updatePasswordAndClearResetToken(
      user.id,
      newPassword,
    );

    return {
      message: 'Mot de passe réinitialisé avec succès.',
    };
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
