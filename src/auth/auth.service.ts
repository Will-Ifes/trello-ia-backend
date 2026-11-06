import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('E-mail já está em uso');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
    });

    return this.sanitizeUser(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const passwordMatches = user && (await bcrypt.compare(dto.password, user.password));

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email, name: user.name };
    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return this.sanitizeUser(user);
  }

  async sendResetLink(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const message = 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.';
    if (!user) return { message };

    const token = randomBytes(32).toString('hex');
    const stored = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const baseUrl = process.env.FRONTEND_URL;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    try {
      await this.sendEmail(email, 'Recuperação de senha', `Clique para redefinir: ${resetLink}`);
    } catch (error) {
      await this.prisma.passwordResetToken.delete({ where: { id: stored.id } });
      throw error;
    }
    return { message };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.prisma.$transaction(async (tx) => {
        const saved = await tx.passwordResetToken.findUnique({
          where: { token: createHash('sha256').update(token).digest('hex') },
        });
        if (!saved || saved.expiresAt <= new Date()) throw new Error('Expired token');
        // Conditional delete makes concurrent attempts single-use as well.
        const consumed = await tx.passwordResetToken.deleteMany({
          where: { id: saved.id, expiresAt: { gt: new Date() } },
        });
        if (consumed.count !== 1) throw new Error('Consumed token');
        await tx.user.update({ where: { id: saved.userId }, data: { password: hashedPassword } });
        await tx.passwordResetToken.deleteMany({ where: { userId: saved.userId } });
      });
      return { message: 'Senha atualizada com sucesso' };
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  private async sendEmail(to: string, subject: string, text: string) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Trello.ia" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
      });
    } catch (error) {
      console.error('[ERRO AO ENVIAR EMAIL]', error);
      throw new Error('Erro ao enviar e-mail');
    }
  }
}
