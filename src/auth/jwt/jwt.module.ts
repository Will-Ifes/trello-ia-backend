import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy/jwt.strategy';
import { getJwtSecret } from '../../config/jwt-secret';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({ secret: getJwtSecret(), signOptions: { expiresIn: '1d' } }),
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule],
})
export class JwtAuthModule {}
