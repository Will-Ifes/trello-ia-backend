import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { configureApp } from '../src/config/configure-app';

describe('Kanban persistido e isolamento de usuários', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerCookie: string;
  let otherCookie: string;
  let board: any;
  let card: any;
  const suffix = randomUUID();
  const owner = {
    name: 'Dona do quadro',
    email: `owner-${suffix}@example.com`,
    password: 'TestPassword123!',
  };
  const other = {
    name: 'Outro usuário',
    email: `other-${suffix}@example.com`,
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    for (const user of [owner, other])
      await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);
    const login = async (user: typeof owner) => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(201);
      return response.headers['set-cookie'][0].split(';')[0];
    };
    ownerCookie = await login(owner);
    otherCookie = await login(other);
  });

  afterAll(async () => {
    if (prisma) {
      const users = await prisma.user.findMany({
        where: { email: { in: [owner.email, other.email] } },
      });
      await prisma.passwordResetToken.deleteMany({
        where: { userId: { in: users.map((u) => u.id) } },
      });
      await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
    }
    await app?.close();
  });

  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, cookie = ownerCookie) =>
    request(app.getHttpServer())[method](path).set('Cookie', cookie);

  it('rejeita acesso anônimo e dados inválidos', async () => {
    await request(app.getHttpServer()).get('/boards').expect(401);
    await call('post', '/boards').send({ title: '   ' }).expect(400);
    await call('post', '/boards').send({ title: 'Quadro', ownerId: 'forjado' }).expect(400);
    await call('post', '/auth/reset-password')
      .send({ token: 'x', password: 'x', confirmPassword: 'x' })
      .expect(400);
  });

  it('cria quadro com listas padrão e persiste após nova consulta', async () => {
    const response = await call('post', '/boards')
      .send({ title: 'Lançamento', description: 'Projeto de teste' })
      .expect(201);
    board = response.body;
    expect(board.lists.map((l: any) => l.title)).toEqual(['A fazer', 'Em andamento', 'Concluído']);
    const fetched = await call('get', `/boards/${board.id}`).expect(200);
    expect(fetched.body.title).toBe('Lançamento');
  });

  it('não lista nem permite consultar ou alterar quadro alheio', async () => {
    const list = await call('get', '/boards', otherCookie).expect(200);
    expect(list.body).toEqual([]);
    await call('get', `/boards/${board.id}`, otherCookie).expect(404);
    await call('patch', `/boards/${board.id}`, otherCookie).send({ title: 'Invadido' }).expect(404);
    await call('delete', `/boards/${board.id}`, otherCookie).expect(404);
    await call('post', `/boards/${board.id}/lists`, otherCookie)
      .send({ title: 'Invadida' })
      .expect(404);
  });

  it('cria, edita, move e conclui cartão; mantém descrição e prazo', async () => {
    const created = await call('post', `/lists/${board.lists[0].id}/cards`)
      .send({
        title: 'Preparar lançamento',
        description: 'Revisar a página',
        dueDate: '2026-12-01T12:00:00.000Z',
      })
      .expect(201);
    card = created.body;
    await call('patch', `/cards/${card.id}`)
      .send({
        title: 'Publicar lançamento',
        listId: board.lists[1].id,
        position: 0,
        completed: true,
      })
      .expect(200);
    const fetched = await call('get', `/boards/${board.id}`).expect(200);
    expect(fetched.body.lists[1].cards[0]).toMatchObject({
      title: 'Publicar lançamento',
      description: 'Revisar a página',
      completed: true,
      dueDate: '2026-12-01T12:00:00.000Z',
    });
    await call('patch', `/cards/${card.id}`).send({ dueDate: null }).expect(200);
  });

  it('protege listas e cartões contra outro usuário e movimento entre quadros', async () => {
    await call('patch', `/cards/${card.id}`, otherCookie).send({ title: 'Invadido' }).expect(404);
    await call('delete', `/cards/${card.id}`, otherCookie).expect(404);
    await call('post', `/lists/${board.lists[0].id}/cards`, otherCookie)
      .send({ title: 'Invadido' })
      .expect(404);
    await call('patch', `/lists/${board.lists[0].id}`, otherCookie)
      .send({ title: 'Invadida' })
      .expect(404);
    const another = await call('post', '/boards').send({ title: 'Outro projeto' }).expect(201);
    await call('patch', `/cards/${card.id}`).send({ listId: another.body.lists[0].id }).expect(404);
  });

  it('edita quadro, cria e renomeia lista, exclui lista com seus cartões', async () => {
    await call('patch', `/boards/${board.id}`).send({ title: 'Lançamento revisado' }).expect(200);
    const list = await call('post', `/boards/${board.id}/lists`)
      .send({ title: 'Validação' })
      .expect(201);
    await call('patch', `/lists/${list.body.id}`).send({ title: 'Aprovação' }).expect(200);
    const task = await call('post', `/lists/${list.body.id}/cards`)
      .send({ title: 'Revisar' })
      .expect(201);
    await call('delete', `/lists/${list.body.id}`).expect(200);
    expect(await prisma.card.findUnique({ where: { id: task.body.id } })).toBeNull();
  });

  it('recuperação usa token opaco, hash persistido, expiração e uso único', async () => {
    const service = app.get(AuthService);
    const mail = jest.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);
    const missing = await call('post', '/auth/forgot-password')
      .send({ email: `missing-${suffix}@example.com` })
      .expect(201);
    const known = await call('post', '/auth/forgot-password')
      .send({ email: owner.email })
      .expect(201);
    expect(known.body).toEqual(missing.body);
    const token = String(mail.mock.calls[0][2]).match(/token=([a-f0-9]+)/)![1];
    expect(await prisma.passwordResetToken.findUnique({ where: { token } })).toBeNull();
    expect(
      await prisma.passwordResetToken.findUnique({
        where: { token: createHash('sha256').update(token).digest('hex') },
      }),
    ).toBeTruthy();
    await call('post', '/auth/reset-password')
      .send({
        token: ownerCookie.split('=')[1],
        password: 'ChangedPassword123!',
        confirmPassword: 'ChangedPassword123!',
      })
      .expect(401);
    await call('post', '/auth/reset-password')
      .send({ token, password: 'ChangedPassword123!', confirmPassword: 'ChangedPassword123!' })
      .expect(201);
    await call('post', '/auth/reset-password')
      .send({ token, password: 'ChangedAgain123!', confirmPassword: 'ChangedAgain123!' })
      .expect(401);
    await call('post', '/auth/login')
      .send({ email: owner.email, password: 'ChangedPassword123!' })
      .expect(201);
    mail.mockRestore();
  });

  it('IA sem credenciais fica indisponível sem criar quadros', async () => {
    const key = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const status = await call('get', '/ai/status').expect(200);
      expect(status.body.available).toBe(false);
      await call('post', '/ai/boards')
        .send({ prompt: 'Organizar um lançamento de produto' })
        .expect(503);
    } finally {
      if (key) process.env.OPENROUTER_API_KEY = key;
    }
  });

  it('exclui cartão e quadro em cascata', async () => {
    await call('delete', `/cards/${card.id}`).expect(200);
    await call('delete', `/boards/${board.id}`).expect(200);
    expect(await prisma.boardList.count({ where: { boardId: board.id } })).toBe(0);
    await call('get', `/boards/${board.id}`).expect(404);
  });
});
