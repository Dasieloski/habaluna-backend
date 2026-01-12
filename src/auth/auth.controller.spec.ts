import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController (cookies refresh)', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const mockAuthService = (): jest.Mocked<AuthService> =>
    ({
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      setRefreshCookie: jest.fn(),
      clearRefreshCookie: jest.fn(),
      getRefreshCookie: jest.fn(),
    }) as any;

  const mockRes = (): Response =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as any;

  const mockReq = (cookies: Record<string, string> = {}): Request =>
    ({
      cookies,
    }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // Proveer dependencias requeridas por ThrottlerGuard (usado en el controller)
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60, limit: 100 }],
        }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService(),
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('login: setea cookie y NO retorna refreshToken en el body', async () => {
    service.login.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', role: 'USER' },
      accessToken: 'access',
      refreshToken: 'refresh',
    } as any);

    const res = mockRes();
    const body = await controller.login({ email: 'a@b.com', password: 'x' } as any, res);

    expect(service.setRefreshCookie).toHaveBeenCalledWith(res, 'refresh');
    expect(body).toEqual({
      user: { id: 'u1', email: 'a@b.com', role: 'USER' },
      accessToken: 'access',
    });
  });

  it('register: setea cookie y NO retorna refreshToken en el body', async () => {
    service.register.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', role: 'USER' },
      accessToken: 'access',
      refreshToken: 'refresh',
    } as any);

    const res = mockRes();
    const body = await controller.register(
      { email: 'a@b.com', password: 'x', firstName: 'A', lastName: 'B' } as any,
      res,
    );

    expect(service.setRefreshCookie).toHaveBeenCalledWith(res, 'refresh');
    expect((body as any).refreshToken).toBeUndefined();
    expect(body).toEqual({
      user: { id: 'u1', email: 'a@b.com', role: 'USER' },
      accessToken: 'access',
    });
  });

  it('refresh: usa cookie por defecto, rota cookie y retorna solo accessToken', async () => {
    service.getRefreshCookie.mockReturnValue('cookie-refresh');
    service.refreshToken.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    } as any);

    const req = mockReq({ refreshToken: 'cookie-refresh' });
    const res = mockRes();
    const body = await controller.refresh(req, {} as any, res);

    expect(service.refreshToken).toHaveBeenCalledWith('cookie-refresh');
    expect(service.setRefreshCookie).toHaveBeenCalledWith(res, 'new-refresh');
    expect(body).toEqual({ accessToken: 'new-access' });
  });

  it('refresh: fallback a body si no hay cookie', async () => {
    service.getRefreshCookie.mockReturnValue(undefined);
    service.refreshToken.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    } as any);

    const req = mockReq({});
    const res = mockRes();
    await controller.refresh(req, { refreshToken: 'body-refresh' } as any, res);

    expect(service.refreshToken).toHaveBeenCalledWith('body-refresh');
  });

  it('logout: limpia cookie y elimina token (cookie preferida)', async () => {
    service.getRefreshCookie.mockReturnValue('cookie-refresh');
    service.logout.mockResolvedValue({ message: 'Logged out successfully' } as any);

    const req = mockReq({ refreshToken: 'cookie-refresh' });
    const res = mockRes();
    const body = await controller.logout(req, { refreshToken: 'body-refresh' } as any, res);

    expect(service.logout).toHaveBeenCalledWith('cookie-refresh');
    expect(service.clearRefreshCookie).toHaveBeenCalledWith(res);
    expect(body).toEqual({ message: 'Logged out successfully' });
  });
});
