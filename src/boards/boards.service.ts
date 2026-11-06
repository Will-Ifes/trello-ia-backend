import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BoardDto, CardDto, UpdateCardDto } from './boards.dto';

const include = {
  lists: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    include: { cards: { orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }] } },
  },
};

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  all(ownerId: string) {
    return this.prisma.board.findMany({
      where: { ownerId },
      include,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(ownerId: string, id: string) {
    const board = await this.prisma.board.findFirst({ where: { id, ownerId }, include });
    if (!board) throw new NotFoundException('Quadro não encontrado');
    return board;
  }

  create(ownerId: string, dto: BoardDto) {
    return this.prisma.board.create({
      data: {
        ...dto,
        ownerId,
        lists: {
          create: ['A fazer', 'Em andamento', 'Concluído'].map((title, position) => ({
            title,
            position,
          })),
        },
      },
      include,
    });
  }

  async update(ownerId: string, id: string, dto: BoardDto) {
    await this.get(ownerId, id);
    return this.prisma.board.update({ where: { id }, data: dto, include });
  }

  async remove(ownerId: string, id: string) {
    await this.get(ownerId, id);
    await this.prisma.board.delete({ where: { id } });
    return { success: true };
  }

  async addList(ownerId: string, boardId: string, title: string) {
    const board = await this.get(ownerId, boardId);
    const position = Math.max(-1, ...board.lists.map((list) => list.position)) + 1;
    return this.prisma.boardList.create({ data: { title, boardId, position } });
  }

  private async ownedList(ownerId: string, id: string) {
    const list = await this.prisma.boardList.findFirst({ where: { id, board: { ownerId } } });
    if (!list) throw new NotFoundException('Lista não encontrada');
    return list;
  }

  async renameList(ownerId: string, id: string, title: string) {
    await this.ownedList(ownerId, id);
    return this.prisma.boardList.update({ where: { id }, data: { title } });
  }

  async removeList(ownerId: string, id: string) {
    await this.ownedList(ownerId, id);
    await this.prisma.boardList.delete({ where: { id } });
    return { success: true };
  }

  async addCard(ownerId: string, listId: string, dto: CardDto) {
    await this.ownedList(ownerId, listId);
    const last = await this.prisma.card.aggregate({ where: { listId }, _max: { position: true } });
    return this.prisma.card.create({
      data: { ...dto, listId, position: (last._max.position ?? -1) + 1 },
    });
  }

  private async ownedCard(ownerId: string, id: string) {
    const card = await this.prisma.card.findFirst({
      where: { id, list: { board: { ownerId } } },
      include: { list: true },
    });
    if (!card) throw new NotFoundException('Cartão não encontrado');
    return card;
  }

  async updateCard(ownerId: string, id: string, dto: UpdateCardDto) {
    const card = await this.ownedCard(ownerId, id);
    if (dto.listId) {
      const destination = await this.ownedList(ownerId, dto.listId);
      if (destination.boardId !== card.list.boardId)
        throw new NotFoundException('Lista não pertence ao quadro');
    }
    return this.prisma.card.update({ where: { id }, data: dto });
  }

  async removeCard(ownerId: string, id: string) {
    await this.ownedCard(ownerId, id);
    await this.prisma.card.delete({ where: { id } });
    return { success: true };
  }
}
