import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { BoardsService } from './boards.service';
import { BoardDto, CardDto, GenerateBoardDto, TitleDto, UpdateCardDto } from './boards.dto';
import { BoardAiService } from './board-ai.service';
import { Throttle } from '@nestjs/throttler';

type AuthRequest = { user: { id: string } };

@Controller()
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(
    private readonly boards: BoardsService,
    private readonly ai: BoardAiService,
  ) {}
  @Get('boards') all(@Req() req: AuthRequest) {
    return this.boards.all(req.user.id);
  }
  @Post('boards') create(@Req() req: AuthRequest, @Body() dto: BoardDto) {
    return this.boards.create(req.user.id, dto);
  }
  @Get('boards/:id') get(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.boards.get(req.user.id, id);
  }
  @Patch('boards/:id') update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: BoardDto,
  ) {
    return this.boards.update(req.user.id, id, dto);
  }
  @Delete('boards/:id') remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.boards.remove(req.user.id, id);
  }
  @Post('boards/:id/lists') addList(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: TitleDto,
  ) {
    return this.boards.addList(req.user.id, id, dto.title);
  }
  @Patch('lists/:id') renameList(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: TitleDto,
  ) {
    return this.boards.renameList(req.user.id, id, dto.title);
  }
  @Delete('lists/:id') removeList(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.boards.removeList(req.user.id, id);
  }
  @Post('lists/:id/cards') addCard(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: CardDto,
  ) {
    return this.boards.addCard(req.user.id, id, dto);
  }
  @Patch('cards/:id') updateCard(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.boards.updateCard(req.user.id, id, dto);
  }
  @Delete('cards/:id') removeCard(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.boards.removeCard(req.user.id, id);
  }
  @Get('ai/status') aiStatus() {
    return this.ai.status();
  }
  @Post('ai/boards')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  generate(@Req() req: AuthRequest, @Body() dto: GenerateBoardDto) {
    return this.ai.generate(req.user.id, dto.prompt);
  }
}
