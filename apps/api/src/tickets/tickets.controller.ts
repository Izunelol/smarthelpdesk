import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { CreateRatingDto } from '../ratings/dto/create-rating.dto';
import { Ticket } from './ticket.entity';
import { ChatMessage } from './chat-message.entity';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Ticket> {
    const requester = await this.usersService.findById(currentUser.userId);
    return this.ticketsService.create(dto, requester!);
  }

  @Get()
  findAll(
    @Query() query: QueryTicketsDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Ticket[]> {
    return this.ticketsService.findAll(query, currentUser);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Ticket> {
    return this.ticketsService.findByIdForUser(id, currentUser);
  }

  @Patch(':id/escalate')
  escalate(
    @Param('id') id: string,
    @Body() dto: EscalateTicketDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Ticket> {
    return this.ticketsService.escalate(id, dto, currentUser);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Ticket> {
    return this.ticketsService.updateStatus(id, dto, currentUser);
  }

  @Post(':id/rating')
  rate(
    @Param('id') id: string,
    @Body() dto: CreateRatingDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Ticket> {
    return this.ticketsService.rate(id, dto, currentUser);
  }

  @Get(':id/messages')
  listMessages(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<ChatMessage[]> {
    return this.ticketsService.listMessages(id, currentUser);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendChatMessageDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<{ ticket: Ticket; messages: ChatMessage[] }> {
    return this.ticketsService.sendChatMessage(id, dto, currentUser);
  }
}
