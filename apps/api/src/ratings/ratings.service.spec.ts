import { ConflictException } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { Ticket } from '../tickets/ticket.entity';

describe('RatingsService', () => {
  let service: RatingsService;
  let repository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  const ticket = { id: 'ticket-1' } as Ticket;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'rating-1', ...v })),
    };
    service = new RatingsService(repository as any);
  });

  it('creates a rating for a ticket that has none yet', async () => {
    repository.findOne.mockResolvedValue(null);

    const rating = await service.create(ticket, { score: 5, comment: 'Ótimo atendimento' });

    expect(repository.create).toHaveBeenCalledWith({
      score: 5,
      comment: 'Ótimo atendimento',
      ticket,
    });
    expect(rating).toEqual(expect.objectContaining({ id: 'rating-1', score: 5 }));
  });

  it('rejects rating a ticket that has already been rated', async () => {
    repository.findOne.mockResolvedValue({ id: 'existing-rating' });

    await expect(service.create(ticket, { score: 3 })).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
