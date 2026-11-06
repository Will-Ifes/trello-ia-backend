import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtAuthModule } from './jwt/jwt.module';

@Module({
  imports: [PrismaModule, PassportModule, JwtAuthModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
