import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      const { token, user } = await this.authService.login(dto);

      res.cookie('auth_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        maxAge: 1000 * 60 * 60 * 24, // 1 dia
      });

      return { user };
    } catch (error) {
      console.error('[LOGIN ERROR]', error);
      throw new UnauthorizedException('Usuário ou senha inválidos');
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    try {
      return await this.authService.sendResetLink(email);
    } catch (error) {
      console.error('[FORGOT PASSWORD ERROR]', error);
      throw new BadRequestException(error.message);
    }
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
    @Body('confirmPassword') confirmPassword: string,
  ) {
    if (password !== confirmPassword) {
      throw new BadRequestException('Senhas não coincidem');
    }
    return this.authService.resetPassword(token, password);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token');
    return { message: 'Logout efetuado com sucesso.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return req.user;
  }
}
