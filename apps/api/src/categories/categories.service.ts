import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return category;
  }

  create(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoriesRepository.create(dto);
    return this.categoriesRepository.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findById(id);
    Object.assign(category, dto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findById(id);
    await this.categoriesRepository.remove(category);
  }

  async findOrCreateByName(name: string, description: string): Promise<Category> {
    const existing = await this.categoriesRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name })
      .getOne();
    if (existing) {
      return existing;
    }

    const category = this.categoriesRepository.create({ name, description });
    return this.categoriesRepository.save(category);
  }
}
