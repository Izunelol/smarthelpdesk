import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeArticle } from './knowledge-article.entity';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeArticle])],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [TypeOrmModule, KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
