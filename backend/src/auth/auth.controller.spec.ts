import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockProfile = {
    id: 1,
    username: 'john.doe',
    role: 'STUDENT',
    fullName: 'John Doe',
    email: 'john@uni.edu',
  };
  const mockLoginResult = {
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    user: mockProfile,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            getMe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('login calls authService.login and returns result', async () => {
    authService.login.mockResolvedValue(mockLoginResult as any);

    const result = await controller.login({ username: 'john.doe', password: 'secret' });

    expect(authService.login).toHaveBeenCalledWith('john.doe', 'secret');
    expect(result).toBe(mockLoginResult);
  });

  it('refresh calls authService.refresh and returns new tokens', async () => {
    const tokens = { accessToken: 'new.access', refreshToken: 'new.refresh' };
    authService.refresh.mockResolvedValue(tokens);

    const result = await controller.refresh({ refreshToken: 'old.refresh.token' });

    expect(authService.refresh).toHaveBeenCalledWith('old.refresh.token');
    expect(result).toBe(tokens);
  });

  it('logout calls authService.logout with userId', async () => {
    authService.logout.mockResolvedValue(undefined);

    await controller.logout({ id: 42 } as any);

    expect(authService.logout).toHaveBeenCalledWith(42);
  });

  it('getMe calls authService.getMe with userId and returns profile', async () => {
    authService.getMe.mockResolvedValue(mockProfile as any);

    const result = await controller.getMe({ id: 1 } as any);

    expect(authService.getMe).toHaveBeenCalledWith(1);
    expect(result).toBe(mockProfile);
  });
});
