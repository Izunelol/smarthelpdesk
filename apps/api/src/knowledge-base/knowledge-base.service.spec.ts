import { NotFoundException } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: { where: jest.Mock; limit: jest.Mock; getMany: jest.Mock };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'article-1', ...v })),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    service = new KnowledgeBaseService(repository as any);
  });

  describe('create', () => {
    it('defaults keywords to an empty array when not provided', async () => {
      await service.create({ title: 'Reset de senha', content: 'Como resetar a senha' } as any);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Reset de senha', keywords: [] }),
      );
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the article does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('search', () => {
    it('returns an empty array for a blank query', async () => {
      const result = await service.search('   ');

      expect(result).toEqual([]);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns full-text matches when available', async () => {
      const articles = [{ id: 'article-1', title: 'VPN' }];
      queryBuilder.getMany.mockResolvedValueOnce(articles);

      const result = await service.search('conectar vpn');

      expect(result).toBe(articles);
      expect(queryBuilder.getMany).toHaveBeenCalledTimes(1);
    });

    it('falls back to ILIKE search when full-text finds nothing', async () => {
      const fallbackArticles = [{ id: 'article-2', title: 'Impressora' }];
      queryBuilder.getMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(fallbackArticles);

      const result = await service.search('impressora');

      expect(result).toBe(fallbackArticles);
      expect(queryBuilder.getMany).toHaveBeenCalledTimes(2);
    });
  });
});
