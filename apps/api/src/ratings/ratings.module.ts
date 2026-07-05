import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rating } from './rating.entity';
import { RatingsService } from './ratings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rating])],
  providers: [RatingsService],
  exports: [TypeOrmModule, RatingsService],
})
export class RatingsModule {}
