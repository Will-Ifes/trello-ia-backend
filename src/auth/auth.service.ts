import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private sanitizeUser(user: any) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async register(dto: RegisterDto): Promise<any> {
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

  async login(dto: LoginDto): Promise<{ token: string; user: any }> {
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

  async validateUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return this.sanitizeUser(user);
  }

  async sendResetLink(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const token = this.jwtService.sign({ sub: user.id }, { expiresIn: '15m' });

    const baseUrl = process.env.FRONTEND_URL;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    await this.sendEmail(email, 'Recuperação de senha', `Clique para redefinir: ${resetLink}`);

    return { message: 'E-mail enviado com sucesso' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { password: hashedPassword },
      });
      return { message: 'Senha atualizada com sucesso' };
    } catch (e) {
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

      const info = await transporter.sendMail({
        from: `"Trello.ia" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
      });

      console.log('[EMAIL ENVIADO]', info);
    } catch (error) {
      console.error('[ERRO AO ENVIAR EMAIL]', error);
      throw new Error('Erro ao enviar e-mail');
    }
  }
}
