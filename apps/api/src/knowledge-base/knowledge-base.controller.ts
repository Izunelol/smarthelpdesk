import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { KnowledgeArticle } from './knowledge-article.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('knowledge')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  findAll(@Query('q') query?: string): Promise<KnowledgeArticle[]> {
    if (query) {
      return this.knowledgeBaseService.search(query, 10);
    }
    return this.knowledgeBaseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<KnowledgeArticle> {
    return this.knowledgeBaseService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateArticleDto): Promise<KnowledgeArticle> {
    return this.knowledgeBaseService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TECHNICIAN, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto): Promise<KnowledgeArticle> {
    return this.knowledgeBaseService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.knowledgeBaseService.remove(id);
  }
}
