import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { TicketsService } from '../tickets/tickets.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly ticketsService: TicketsService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

  // RF16 — GET /ai/suggestions/:id
  @Get('suggestions/:id')
  async suggestions(@Param('id') id: string): Promise<{ suggestions: string[] }> {
    const ticket = await this.ticketsService.findById(id);
    const articles = await this.knowledgeBaseService.search(ticket.description, 5);
    const suggestions = await this.aiService.suggestSolutions(ticket.description, articles);
    return { suggestions };
  }
}
