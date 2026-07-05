import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  const jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

  const user: User = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: '',
    role: UserRole.USER,
    createdAt: new Date(),
    tickets: [],
    attendances: [],
  };

  beforeEach(async () => {
    user.passwordHash = await bcrypt.hash('correct-password', 4);
    usersService = { findByEmail: jest.fn() } as unknown as jest.Mocked<UsersService>;
    authService = new AuthService(usersService, jwtService as any);
  });

  describe('validateUser', () => {
    it('returns the user when credentials match', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      const result = await authService.validateUser('alice@example.com', 'correct-password');

      expect(result).toBe(user);
    });

    it('throws when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.validateUser('unknown@example.com', 'whatever'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        authService.validateUser('alice@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('signs a JWT with the user id, email and role', () => {
      const result = authService.login(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual({ accessToken: 'signed-token' });
    });
  });
});
