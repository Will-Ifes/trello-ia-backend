import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: jest.Mocked<JwtService>;

  const mockJwt = {
    signAsync: jest.fn(),
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService) as jest.Mocked<JwtService>;

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.clearAllMocks());

  it('deve estar definido', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('deve criar um novo usuário', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        email: 'will@email.com',
        name: 'Will',
        password: 'hashed',
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await authService.register({
        name: 'Will',
        email: 'will@email.com',
        password: '123456',
      });

      expect(result).toEqual({ id: '1', email: 'will@email.com', name: 'Will' });
    });

    it('deve lançar uma exceção de conflito se o usuário já existir', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        authService.register({ name: 'Will', email: 'will@email.com', password: '123456' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('deve retornar um token e o usuário', async () => {
      const mockUser = {
        id: '1',
        name: 'Will',
        email: 'will@email.com',
        password: 'hashed',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.signAsync.mockResolvedValue('fake-token');

      const result = await authService.login({ email: 'will@email.com', password: '123456' });

      expect(result).toEqual({
        token: 'fake-token',
        user: { id: '1', name: 'Will', email: 'will@email.com' },
      });
    });

    it('deve lançar exceção se usuário não existir', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login({ email: 'x@email.com', password: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('sendResetLink', () => {
    it('deve enviar e-mail com link', async () => {
      const user = { id: '1', email: 'test@email.com' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockJwt.sign.mockReturnValue('token');

      const spy = jest.spyOn(authService as any, 'sendEmail').mockResolvedValue(undefined);

      const result = await authService.sendResetLink('test@email.com');

      expect(result).toEqual({ message: 'E-mail enviado com sucesso' });
      expect(spy).toHaveBeenCalled();
    });

    it('deve lançar erro se usuário não encontrado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.sendResetLink('x@email.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetPassword', () => {
    it('deve atualizar a senha do usuário', async () => {
      mockJwt.verifyAsync.mockResolvedValue({ sub: '1' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHash');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await authService.resetPassword('token', 'newPass');

      expect(result).toEqual({ message: 'Senha atualizada com sucesso' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { password: 'newHash' },
      });
    });

    it('deve lançar exceção se token for inválido', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new Error());

      await expect(authService.resetPassword('token', 'x')).rejects.toThrow(UnauthorizedException);
    });
  });
});
