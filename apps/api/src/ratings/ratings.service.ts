import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './rating.entity';
import { Ticket } from '../tickets/ticket.entity';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingsRepository: Repository<Rating>,
  ) {}

  async create(ticket: Ticket, dto: CreateRatingDto): Promise<Rating> {
    const existing = await this.ratingsRepository.findOne({
      where: { ticket: { id: ticket.id } },
    });
    if (existing) {
      throw new ConflictException('Chamado já avaliado');
    }

    const rating = this.ratingsRepository.create({ ...dto, ticket });
    return this.ratingsRepository.save(rating);
  }
}
