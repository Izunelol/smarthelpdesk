import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeArticle } from './knowledge-article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectRepository(KnowledgeArticle)
    private readonly articlesRepository: Repository<KnowledgeArticle>,
  ) {}

  findAll(): Promise<KnowledgeArticle[]> {
    return this.articlesRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async findById(id: string): Promise<KnowledgeArticle> {
    const article = await this.articlesRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }
    return article;
  }

  create(dto: CreateArticleDto): Promise<KnowledgeArticle> {
    const article = this.articlesRepository.create({
      ...dto,
      keywords: dto.keywords ?? [],
    });
    return this.articlesRepository.save(article);
  }

  async update(id: string, dto: UpdateArticleDto): Promise<KnowledgeArticle> {
    const article = await this.findById(id);
    Object.assign(article, dto);
    return this.articlesRepository.save(article);
  }

  async remove(id: string): Promise<void> {
    const article = await this.findById(id);
    await this.articlesRepository.remove(article);
  }

  // RF16 — busca full-text (tsvector) para recuperar artigos candidatos ao RAG
  async search(query: string, limit = 5): Promise<KnowledgeArticle[]> {
    if (!query?.trim()) {
      return [];
    }

    const byFullText = await this.articlesRepository
      .createQueryBuilder('article')
      .where(
        `to_tsvector('portuguese', article.title || ' ' || article.content) @@ plainto_tsquery('portuguese', :query)`,
        { query },
      )
      .limit(limit)
      .getMany();

    if (byFullText.length > 0) {
      return byFullText;
    }

    return this.articlesRepository
      .createQueryBuilder('article')
      .where('article.title ILIKE :like OR article.content ILIKE :like', {
        like: `%${query}%`,
      })
      .limit(limit)
      .getMany();
  }
}
