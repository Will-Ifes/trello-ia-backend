import {
  BadGatewayException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Plan = {
  title: string;
  description: string;
  lists: { title: string; cards: { title: string; description: string }[] }[];
};

// Treat provider output as untrusted data before persisting any part of it.
export function parsePlan(value: unknown): Plan {
  const record = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Objeto inválido');
    return v as Record<string, unknown>;
  };
  const text = (v: unknown, max: number) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error('Texto inválido');
    return v.trim();
  };
  const plan = record(value);
  if (!Array.isArray(plan.lists) || plan.lists.length < 1 || plan.lists.length > 8)
    throw new Error('Listas inválidas');
  return {
    title: text(plan.title, 120),
    description: text(plan.description, 2000),
    lists: plan.lists.map((item) => {
      const list = record(item);
      if (!Array.isArray(list.cards) || list.cards.length > 15)
        throw new Error('Cartões inválidos');
      return {
        title: text(list.title, 120),
        cards: list.cards.map((item) => {
          const card = record(item);
          return { title: text(card.title, 120), description: text(card.description, 10000) };
        }),
      };
    }),
  };
}

@Injectable()
export class BoardAiService {
  private readonly active = new Set<string>();
  constructor(private readonly prisma: PrismaService) {}
  status() {
    return { available: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL) };
  }

  async generate(ownerId: string, prompt: string) {
    if (!this.status().available)
      throw new ServiceUnavailableException(
        'A IA precisa ser configurada pelo administrador. Você pode criar quadros manualmente.',
      );
    if (this.active.has(ownerId))
      throw new HttpException('Já existe uma geração em andamento.', 429);
    this.active.add(ownerId);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(45000),
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL,
          max_tokens: 3500,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Crie um plano Kanban em português. Responda somente JSON: {"title":"título até 120 caracteres","description":"resumo","lists":[{"title":"etapa","cards":[{"title":"tarefa","description":"instruções"}]}]}. Use de 1 a 8 listas, até 15 cartões por lista. Descrições devem ser textos não vazios. Não inclua markdown.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!response.ok) throw new Error('Provider error');
      const data = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Invalid provider response');
      const plan = parsePlan(JSON.parse(content));
      return await this.prisma.board.create({
        data: {
          title: plan.title,
          description: plan.description,
          ownerId,
          lists: {
            create: plan.lists.map((list, position) => ({
              title: list.title,
              position,
              cards: { create: list.cards.map((card, position) => ({ ...card, position })) },
            })),
          },
        },
        include: { lists: { include: { cards: true } } },
      });
    } catch {
      throw new BadGatewayException(
        'Não foi possível gerar o quadro. Tente novamente em instantes.',
      );
    } finally {
      this.active.delete(ownerId);
    }
  }
}
