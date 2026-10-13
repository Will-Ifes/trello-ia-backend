import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

const mockUser = {
  id: 'user-id',
  name: 'Will',
  email: 'will@email.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn().mockResolvedValue(mockUser),
    login: jest.fn().mockResolvedValue({ token: 'fake-token', user: mockUser }),
    sendResetLink: jest.fn().mockResolvedValue({ message: 'E-mail enviado com sucesso' }),
    resetPassword: jest.fn().mockResolvedValue({ message: 'Senha atualizada com sucesso' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('deve registrar e retornar o usuário', async () => {
      const result = await controller.register({
        name: 'Will',
        email: 'will@email.com',
        password: '123456',
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('deve realizar login e retornar o usuário', async () => {
      const res: any = { cookie: jest.fn() };
      const result = await controller.login(
        {
          email: 'will@email.com',
          password: '123456',
        },
        res,
      );
      expect(result).toEqual({ user: mockUser });
      expect(res.cookie).toHaveBeenCalledWith('auth_token', 'fake-token', expect.any(Object));
    });

    it('deve lançar exceção de não autorizado em caso de erro', async () => {
      jest.spyOn(service, 'login').mockRejectedValueOnce(new Error());
      await expect(
        controller.login({ email: 'fail@email.com', password: 'wrong' }, {} as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('deve enviar um link de redefinição de senha', async () => {
      const result = await controller.forgotPassword('will@email.com');
      expect(result).toEqual({ message: 'E-mail enviado com sucesso' });
    });
  });

  describe('resetPassword', () => {
    it('deve lançar exceção se as senhas não coincidirem', async () => {
      await expect(controller.resetPassword('token', '123456', '654321')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve redefinir a senha se o token e as senhas forem válidos', async () => {
      const result = await controller.resetPassword('token', '123456', '123456');
      expect(result).toEqual({ message: 'Senha atualizada com sucesso' });
    });
  });

  describe('logout', () => {
    it('deve limpar o cookie e retornar mensagem de sucesso', () => {
      const res: any = { clearCookie: jest.fn() };
      const result = controller.logout(res);
      expect(res.clearCookie).toHaveBeenCalledWith('auth_token');
      expect(result).toEqual({ message: 'Logout efetuado com sucesso.' });
    });
  });
});
