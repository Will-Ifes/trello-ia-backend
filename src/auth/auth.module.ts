import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'prisma/prisma.service';
import { JwtAuthModule } from './jwt/jwt.module';

@Module({
  imports: [PassportModule, JwtAuthModule],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AuthModule {}
