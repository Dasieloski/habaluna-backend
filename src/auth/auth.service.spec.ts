import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { createMockPrismaService } from '../common/mocks/prisma.mock';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let prismaService: any;
  let emailService: jest.Mocked<EmailService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER' as UserRole,
    isActive: true,
    phone: null,
    address: null,
    city: null,
    zipCode: null,
    country: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_REFRESH_EXPIRATION: '7d',
                FRONTEND_URL: 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    prismaService = module.get(PrismaService);
    emailService = module.get(EmailService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('debería retornar el usuario sin password si las credenciales son válidas', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
        phone: mockUser.phone,
        address: mockUser.address,
        city: mockUser.city,
        zipCode: mockUser.zipCode,
        country: mockUser.country,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result.password).toBeUndefined();
    });

    it('debería retornar null si el usuario no existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('debería retornar null si la contraseña es incorrecta', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('debería retornar null si el usuario está inactivo', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByEmail.mockResolvedValue(inactiveUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('debería retornar usuario y tokens cuando las credenciales son válidas', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('access-token');
      prismaService.refreshToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'refresh-token',
        userId: mockUser.id,
        expiresAt: new Date(),
        createdAt: new Date(),
      } as any);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('debería lanzar UnauthorizedException si las credenciales son inválidas', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('debería crear un nuevo usuario y retornar tokens', async () => {
      const newUser = { ...mockUser, email: registerDto.email };
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      usersService.create.mockResolvedValue(newUser);
      jwtService.sign.mockReturnValue('access-token');
      prismaService.refreshToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'refresh-token',
        userId: newUser.id,
        expiresAt: new Date(),
        createdAt: new Date(),
      } as any);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          password: 'hashedPassword',
        }),
      );
    });
  });

  describe('refreshToken', () => {
    const validToken = 'valid-refresh-token';
    const mockPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    };

    it('debería retornar nuevos tokens cuando el refresh token es válido', async () => {
      const tokenRecord = {
        id: 'token-1',
        token: validToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000), // Mañana
        createdAt: new Date(),
        user: mockUser,
      };

      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.refreshToken.findUnique.mockResolvedValue(tokenRecord as any);
      jwtService.sign.mockReturnValue('new-access-token');
      prismaService.refreshToken.create.mockResolvedValue({
        id: 'token-2',
        token: 'new-refresh-token',
        userId: mockUser.id,
        expiresAt: new Date(),
        createdAt: new Date(),
      } as any);

      const result = await service.refreshToken(validToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('debería lanzar UnauthorizedException si el token no existe', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(validToken)).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el token está expirado', async () => {
      const expiredToken = {
        id: 'token-1',
        token: validToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 86400000), // Ayer
        createdAt: new Date(),
        user: mockUser,
      };

      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.refreshToken.findUnique.mockResolvedValue(expiredToken as any);

      await expect(service.refreshToken(validToken)).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el usuario está inactivo', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const tokenRecord = {
        id: 'token-1',
        token: validToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        user: inactiveUser,
      };

      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.refreshToken.findUnique.mockResolvedValue(tokenRecord as any);

      await expect(service.refreshToken(validToken)).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el token es inválido', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('debería enviar email de recuperación si el usuario existe y está activo', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      prismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 0 } as any);
      prismaService.passwordResetToken.create.mockResolvedValue({
        id: 'token-1',
        userId: mockUser.id,
        token: 'hashed-token',
        expiresAt: new Date(),
        used: false,
      } as any);

      const result = await service.forgotPassword('test@example.com');

      expect(result).toHaveProperty('message');
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('debería retornar mensaje genérico incluso si el usuario no existe (seguridad)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result).toHaveProperty('message');
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const validToken = 'valid-reset-token';
    const newPassword = 'newPassword123';

    it('debería actualizar la contraseña cuando el token es válido', async () => {
      const tokenRecord = {
        id: 'token-1',
        userId: mockUser.id,
        token: 'hashed-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hora desde ahora
        used: false,
        user: mockUser,
      };

      prismaService.passwordResetToken.findUnique.mockResolvedValue(tokenRecord as any);
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword' as never);
      prismaService.$transaction.mockResolvedValue([
        mockUser,
        { ...tokenRecord, used: true },
        { count: 0 },
      ] as any);

      const result = await service.resetPassword(validToken, newPassword);

      expect(result).toHaveProperty('message');
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si el token no existe', async () => {
      prismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(validToken, newPassword)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar BadRequestException si el token está expirado', async () => {
      const expiredToken = {
        id: 'token-1',
        userId: mockUser.id,
        token: 'hashed-token',
        expiresAt: new Date(Date.now() - 3600000), // 1 hora atrás
        used: false,
        user: mockUser,
      };

      prismaService.passwordResetToken.findUnique.mockResolvedValue(expiredToken as any);

      await expect(service.resetPassword(validToken, newPassword)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar BadRequestException si el token ya fue usado', async () => {
      const usedToken = {
        id: 'token-1',
        userId: mockUser.id,
        token: 'hashed-token',
        expiresAt: new Date(Date.now() + 3600000),
        used: true,
        user: mockUser,
      };

      prismaService.passwordResetToken.findUnique.mockResolvedValue(usedToken as any);

      await expect(service.resetPassword(validToken, newPassword)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar BadRequestException si el token está vacío', async () => {
      await expect(service.resetPassword('', newPassword)).rejects.toThrow(BadRequestException);
    });
  });
});
