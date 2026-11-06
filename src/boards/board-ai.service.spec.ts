import { BoardAiService, parsePlan } from './board-ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';

const plan = {
  title: 'Lançamento',
  description: 'Um projeto',
  lists: [
    { title: 'Planejar', cards: [{ title: 'Definir escopo', description: 'Listar as entregas' }] },
  ],
};

describe('Planejamento por IA', () => {
  const create = jest.fn();
  const service = new BoardAiService({ board: { create } } as unknown as PrismaService);
  let fetchSpy: jest.SpyInstance;
  const originalKey = process.env.OPENROUTER_API_KEY;
  const originalModel = process.env.OPENROUTER_MODEL;
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'test-model';
    fetchSpy = jest.spyOn(globalThis, 'fetch');
    create.mockReset();
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = originalModel;
  });
  it('persiste plano válido como uma única criação aninhada', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(plan) } }] })),
    );
    create.mockResolvedValue({ id: 'board-1' });
    await expect(service.generate('owner-1', 'Organize meu lançamento')).resolves.toEqual({
      id: 'board-1',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'owner-1', title: 'Lançamento' }),
      }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
  });
  it.each([
    null,
    {},
    { ...plan, lists: [] },
    { ...plan, title: 'a'.repeat(121) },
    { ...plan, lists: [{ title: 'x', cards: Array(16).fill(plan.lists[0].cards[0]) }] },
  ])('rejeita estrutura inválida %j', (value) => {
    expect(() => parsePlan(value)).toThrow();
  });
  it('não grava uma resposta inválida do provedor', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'not JSON' } }] })),
    );
    await expect(service.generate('owner-1', 'Organize meu lançamento')).rejects.toThrow(
      BadGatewayException,
    );
    expect(create).not.toHaveBeenCalled();
  });
  it('não chama provedor sem configuração', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(service.generate('owner-1', 'Organize meu lançamento')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('recupera-se depois de timeout ou falha no provedor', async () => {
    fetchSpy
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(plan) } }] })),
      );
    await expect(service.generate('owner-1', 'Organize meu lançamento')).rejects.toThrow(
      BadGatewayException,
    );
    create.mockResolvedValue({ id: 'ok' });
    await expect(service.generate('owner-1', 'Organize meu lançamento')).resolves.toEqual({
      id: 'ok',
    });
  });
});
