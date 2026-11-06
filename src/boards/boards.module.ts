import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtAuthModule } from '../auth/jwt/jwt.module';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardAiService } from './board-ai.service';

@Module({
  imports: [PrismaModule, JwtAuthModule],
  controllers: [BoardsController],
  providers: [BoardsService, BoardAiService],
})
export class BoardsModule {}
