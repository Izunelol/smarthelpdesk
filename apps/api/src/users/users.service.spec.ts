import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'user-1', ...v })),
      update: jest.fn().mockResolvedValue(undefined),
    };
    service = new UsersService(repository as any);
  });

  describe('create', () => {
    it('hashes the password and defaults role to USER', async () => {
      repository.findOne.mockResolvedValue(null);

      const user = await service.create({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
      });

      expect(user.role).toBe(UserRole.USER);
      expect(user.passwordHash).not.toBe('password123');
      expect(repository.save).toHaveBeenCalled();
    });

    it('rejects when the e-mail is already registered', async () => {
      repository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ name: 'Alice', email: 'alice@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRole', () => {
    it('updates the role and returns the refreshed user', async () => {
      repository.findOne
        .mockResolvedValueOnce({ id: 'user-1', role: UserRole.USER })
        .mockResolvedValueOnce({ id: 'user-1', role: UserRole.TECHNICIAN });

      const user = await service.updateRole('user-1', UserRole.TECHNICIAN);

      expect(repository.update).toHaveBeenCalledWith('user-1', { role: UserRole.TECHNICIAN });
      expect(user.role).toBe(UserRole.TECHNICIAN);
    });

    it('rejects when the user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateRole('missing', UserRole.TECHNICIAN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
