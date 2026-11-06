import { BoardAiService, parsePlan } from './board-ai.service';
import { AiQuotaService } from './ai-quota.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadGatewayException, ServiceUnavailableException, HttpException } from '@nestjs/common';

const plan = {
  title: 'Lançamento',
  description: 'Um projeto',
  lists: [
    { title: 'Planejar', cards: [{ title: 'Definir escopo', description: 'Listar as entregas' }] },
  ],
};

describe('Planejamento por IA', () => {
  const create = jest.fn();
  const release = jest.fn().mockResolvedValue(undefined);
  const reserve = jest.fn();
  const service = new BoardAiService(
    { board: { create } } as unknown as PrismaService,
    { reserve } as unknown as AiQuotaService,
  );
  let fetchSpy: jest.SpyInstance;
  const originalKey = process.env.GROQ_API_KEY;
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
    reserve.mockReset().mockResolvedValue(release);
    release.mockClear();
    fetchSpy = jest.spyOn(globalThis, 'fetch');
    create.mockReset();
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
  });
  it('persiste plano válido como uma única criação aninhada', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(plan) } }],
        }),
      ),
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
      'https://api.groq.com/openai/v1/chat/completions',
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
      new Response(
        JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'not JSON' } }] }),
      ),
    );
    await expect(service.generate('owner-1', 'Organize meu lançamento')).rejects.toThrow(
      BadGatewayException,
    );
    expect(create).not.toHaveBeenCalled();
  });
  it('não chama provedor sem configuração', async () => {
    delete process.env.GROQ_API_KEY;
    await expect(service.generate('owner-1', 'Organize meu lançamento')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });
  it('recupera-se depois de timeout ou falha no provedor', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(plan) } }],
        }),
      ),
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

describe('Proteções da geração', () => {
  const create = jest.fn();
  const release = jest.fn().mockResolvedValue(undefined);
  const reserve = jest.fn();
  const service = new BoardAiService(
    { board: { create } } as unknown as PrismaService,
    { reserve } as unknown as AiQuotaService,
  );
  let fetchSpy: jest.SpyInstance;
  const originalKey = process.env.GROQ_API_KEY;
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
    reserve.mockReset().mockResolvedValue(release);
    release.mockClear();
    create.mockReset();
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
  });
  it('não chama o provedor ao exceder a cota', async () => {
    reserve.mockRejectedValue(new HttpException('Limite diário', 429));
    await expect(service.generate('owner', 'Meu projeto')).rejects.toMatchObject({ status: 429 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it.each([429, 401, 403])('preserva erro útil e libera reserva após HTTP %s', async (status) => {
    fetchSpy.mockResolvedValue(new Response('secret provider detail', { status }));
    await expect(service.generate('owner', 'Meu projeto')).rejects.toMatchObject({
      status: status === 429 ? 429 : 503,
    });
    expect(release).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });
  it('rejeita saída truncada mesmo com JSON válido', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'length', message: { content: JSON.stringify(plan) } }],
        }),
      ),
    );
    await expect(service.generate('owner', 'Meu projeto')).rejects.toThrow(BadGatewayException);
    expect(create).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('envia somente o prompt, exige esquema estrito e não transmite a identidade', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(plan) } }],
        }),
      ),
    );
    await service.generate('private-owner-id', 'Preparar uma feira de livros');
    const options = fetchSpy.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(options.body as string);
    expect(payload.model).toBe('openai/gpt-oss-20b');
    expect(payload.response_format.json_schema.strict).toBe(true);
    expect(payload.messages[1]).toEqual({ role: 'user', content: 'Preparar uma feira de livros' });
    expect(options.body).not.toContain('private-owner-id');
    expect(payload.tools).toBeUndefined();
  });
});
