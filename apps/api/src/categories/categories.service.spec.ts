import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: { where: jest.Mock; getOne: jest.Mock };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'cat-1', ...v })),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    service = new CategoriesService(repository as any);
  });

  describe('findById', () => {
    it('returns the category when found', async () => {
      repository.findOne.mockResolvedValue({ id: 'cat-1', name: 'hardware' });

      await expect(service.findById('cat-1')).resolves.toEqual({ id: 'cat-1', name: 'hardware' });
    });

    it('throws NotFoundException when missing', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('merges the dto onto the existing category and saves it', async () => {
      repository.findOne.mockResolvedValue({ id: 'cat-1', name: 'hardware', description: 'old' });

      const result = await service.update('cat-1', { description: 'new description' });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat-1', name: 'hardware', description: 'new description' }),
      );
      expect(result.description).toBe('new description');
    });
  });

  describe('remove', () => {
    it('removes an existing category', async () => {
      repository.findOne.mockResolvedValue({ id: 'cat-1', name: 'hardware' });

      await service.remove('cat-1');

      expect(repository.remove).toHaveBeenCalledWith({ id: 'cat-1', name: 'hardware' });
    });

    it('throws NotFoundException for a missing category', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOrCreateByName', () => {
    it('returns the existing category case-insensitively', async () => {
      queryBuilder.getOne.mockResolvedValue({ id: 'cat-1', name: 'Hardware' });

      const result = await service.findOrCreateByName('hardware', 'desc');

      expect(result).toEqual({ id: 'cat-1', name: 'Hardware' });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('creates a new category when none matches', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await service.findOrCreateByName('rede', 'Categoria sugerida pela IA');

      expect(repository.create).toHaveBeenCalledWith({
        name: 'rede',
        description: 'Categoria sugerida pela IA',
      });
      expect(repository.save).toHaveBeenCalled();
    });
  });
});
