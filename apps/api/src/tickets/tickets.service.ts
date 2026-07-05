import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from './ticket.entity';
import { ChatMessage, ChatMessageSender } from './chat-message.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { CreateRatingDto } from '../ratings/dto/create-rating.dto';
import { CategoriesService } from '../categories/categories.service';
import { UsersService } from '../users/users.service';
import { AttendancesService } from '../attendances/attendances.service';
import { RatingsService } from '../ratings/ratings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { AiService, ChatTurn } from '../ai/ai.service';
import { User, UserRole } from '../users/user.entity';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

const MAX_CHAT_HISTORY = 20;

const LEVEL_ROLE: Record<number, UserRole> = {
  2: UserRole.TECHNICIAN,
  3: UserRole.SPECIALIST,
};

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED, TicketStatus.RESOLVED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.ESCALATED, TicketStatus.RESOLVED],
  [TicketStatus.ESCALATED]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [],
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(ChatMessage)
    private readonly chatMessagesRepository: Repository<ChatMessage>,
    private readonly categoriesService: CategoriesService,
    private readonly usersService: UsersService,
    private readonly attendancesService: AttendancesService,
    private readonly ratingsService: RatingsService,
    private readonly notificationsService: NotificationsService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly aiService: AiService,
  ) {}

  async create(dto: CreateTicketDto, requester: User): Promise<Ticket> {
    const classification = await this.aiService.classify(dto.title, dto.description);

    const category = dto.categoryId
      ? await this.categoriesService.findById(dto.categoryId)
      : await this.categoriesService.findOrCreateByName(
          classification.category,
          `Categoria sugerida automaticamente pela IA (confiança ${classification.confidence}).`,
        );

    const ticket = this.ticketsRepository.create({
      title: dto.title,
      description: dto.description,
      status: TicketStatus.OPEN,
      priority: classification.priority as TicketPriority,
      level: 1,
      requester,
      category,
    });
    const saved = await this.ticketsRepository.save(ticket);

    await this.attendancesService.record({
      ticket: saved,
      responsible: requester,
      level: 1,
      description: 'Chamado aberto e encaminhado ao atendimento nível 1 (chatbot).',
    });

    await this.notificationsService.notifyTicketCreated(requester.email, saved.id, saved.title);

    await this.chatMessagesRepository.save(
      this.chatMessagesRepository.create({
        ticket: saved,
        sender: ChatMessageSender.USER,
        content: dto.description,
        senderUser: requester,
      }),
    );
    await this.replyAsChatbot(saved, [{ role: 'user', content: dto.description }]);

    return this.findById(saved.id);
  }

  findAll(query: QueryTicketsDto, currentUser: JwtPayload): Promise<Ticket[]> {
    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.level) {
      where.level = query.level;
    }
    if (currentUser.role === UserRole.USER) {
      where.requester = { id: currentUser.userId };
    }

    return this.ticketsRepository.find({
      where,
      relations: { requester: true, category: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: {
        requester: true,
        category: true,
        attendances: { responsible: true },
        rating: true,
      },
    });
    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado');
    }
    return ticket;
  }

  async findByIdForUser(id: string, currentUser: JwtPayload): Promise<Ticket> {
    const ticket = await this.findById(id);
    if (currentUser.role === UserRole.USER && ticket.requester.id !== currentUser.userId) {
      throw new ForbiddenException('Você não tem permissão para visualizar este chamado');
    }
    return ticket;
  }

  async escalate(
    id: string,
    dto: EscalateTicketDto,
    actingUser: JwtPayload,
  ): Promise<Ticket> {
    const ticket = await this.findById(id);

    if (ticket.level >= 3) {
      throw new BadRequestException('Chamado já está no nível máximo de atendimento');
    }
    if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.RESOLVED) {
      throw new BadRequestException('Não é possível escalar um chamado finalizado');
    }
    this.assertCanActOnLevel(ticket, actingUser);

    const nextLevel = ticket.level + 1;
    const previousLevel = ticket.level;

    await this.ticketsRepository.update(ticket.id, {
      level: nextLevel,
      status: TicketStatus.ESCALATED,
    });

    const actingUserEntity = await this.usersService.findById(actingUser.userId);
    await this.attendancesService.record({
      ticket,
      responsible: actingUserEntity ?? ticket.requester,
      level: previousLevel,
      description: `Escalado do nível ${previousLevel} para o nível ${nextLevel}. Motivo: ${dto.reason}`,
      endedAt: new Date(),
    });

    await this.notifyLevelAssignment(ticket, nextLevel);
    await this.notificationsService.notifyTicketEscalated(
      ticket.requester.email,
      ticket.id,
      ticket.title,
      nextLevel,
    );

    return this.findById(ticket.id);
  }

  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    actingUser: JwtPayload,
  ): Promise<Ticket> {
    const ticket = await this.findById(id);
    const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transição de status inválida: ${ticket.status} -> ${dto.status}`,
      );
    }
    this.assertCanActOnLevel(ticket, actingUser);

    await this.ticketsRepository.update(ticket.id, {
      status: dto.status,
      ...(dto.status === TicketStatus.CLOSED ? { closedAt: new Date() } : {}),
    });

    const actingUserEntity = await this.usersService.findById(actingUser.userId);
    await this.attendancesService.record({
      ticket,
      responsible: actingUserEntity ?? ticket.requester,
      level: ticket.level,
      description: `Status atualizado para ${dto.status}.`,
      endedAt: [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(dto.status)
        ? new Date()
        : undefined,
    });

    await this.notificationsService.notifyStatusChanged(
      ticket.requester.email,
      ticket.id,
      ticket.title,
      dto.status,
    );

    return this.findById(ticket.id);
  }

  async rate(id: string, dto: CreateRatingDto, actingUser: JwtPayload): Promise<Ticket> {
    const ticket = await this.findById(id);

    if (ticket.requester.id !== actingUser.userId) {
      throw new ForbiddenException('Apenas o solicitante pode avaliar o chamado');
    }
    if (ticket.status !== TicketStatus.RESOLVED) {
      throw new BadRequestException('Somente chamados resolvidos podem ser avaliados');
    }

    await this.ratingsService.create(ticket, dto);

    await this.ticketsRepository.update(ticket.id, {
      status: TicketStatus.CLOSED,
      closedAt: new Date(),
    });

    await this.attendancesService.record({
      ticket,
      responsible: ticket.requester,
      level: ticket.level,
      description: `Chamado avaliado (nota ${dto.score}) e encerrado.`,
      endedAt: new Date(),
    });

    await this.notificationsService.notifyStatusChanged(
      ticket.requester.email,
      ticket.id,
      ticket.title,
      TicketStatus.CLOSED,
    );

    return this.findById(ticket.id);
  }

  // RF15/RF16 — chat do usuário com o chatbot de nível 1, e chat do usuário com o
  // técnico/especialista responsável nos níveis 2 e 3
  async listMessages(id: string, currentUser: JwtPayload): Promise<ChatMessage[]> {
    const ticket = await this.findByIdForUser(id, currentUser);
    this.assertCanChat(ticket, currentUser);
    return this.chatMessagesRepository.find({
      where: { ticket: { id } },
      order: { createdAt: 'ASC' },
      relations: { senderUser: true },
    });
  }

  async sendChatMessage(
    id: string,
    dto: SendChatMessageDto,
    actingUser: JwtPayload,
  ): Promise<{ ticket: Ticket; messages: ChatMessage[] }> {
    const ticket = await this.findByIdForUser(id, actingUser);

    if ([TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status)) {
      throw new BadRequestException('Este chamado já foi finalizado');
    }
    this.assertCanChat(ticket, actingUser);

    const isRequester = ticket.requester.id === actingUser.userId;
    const actingUserEntity = await this.usersService.findById(actingUser.userId);

    const userMessage = await this.chatMessagesRepository.save(
      this.chatMessagesRepository.create({
        ticket,
        sender: isRequester ? ChatMessageSender.USER : ChatMessageSender.STAFF,
        content: dto.content,
        senderUser: actingUserEntity ?? undefined,
      }),
    );

    const messages: ChatMessage[] = [userMessage];

    // No nível 1, o solicitante conversa com o chatbot (IA); nos demais níveis, a
    // conversa é diretamente entre o solicitante e o profissional responsável.
    if (ticket.level === 1 && isRequester) {
      const history = await this.chatMessagesRepository.find({
        where: { ticket: { id } },
        order: { createdAt: 'ASC' },
        take: MAX_CHAT_HISTORY,
      });
      const chatHistory: ChatTurn[] = history.map((message) => ({
        role: message.sender === ChatMessageSender.USER ? 'user' : 'ai',
        content: message.content,
      }));

      const aiMessage = await this.replyAsChatbot(ticket, chatHistory);
      messages.push(aiMessage);
    }

    return {
      ticket: await this.findById(id),
      messages,
    };
  }

  private async replyAsChatbot(ticket: Ticket, history: ChatTurn[]): Promise<ChatMessage> {
    const articles = await this.knowledgeBaseService.search(ticket.description, 5);
    const { reply, resolved } = await this.aiService.chat(ticket.description, history, articles);

    const aiMessage = await this.chatMessagesRepository.save(
      this.chatMessagesRepository.create({
        ticket,
        sender: ChatMessageSender.AI,
        content: reply,
      }),
    );

    if (resolved) {
      await this.resolveByChatbot(ticket);
    }

    return aiMessage;
  }

  private async resolveByChatbot(ticket: Ticket): Promise<void> {
    await this.ticketsRepository.update(ticket.id, { status: TicketStatus.RESOLVED });

    await this.attendancesService.record({
      ticket,
      responsible: ticket.requester,
      level: 1,
      description: 'Chamado resolvido automaticamente pelo chatbot (nível 1).',
      endedAt: new Date(),
    });

    await this.notificationsService.notifyStatusChanged(
      ticket.requester.email,
      ticket.id,
      ticket.title,
      TicketStatus.RESOLVED,
    );
  }

  private assertCanChat(ticket: Ticket, actingUser: JwtPayload): void {
    const isOwner = ticket.requester.id === actingUser.userId;
    const isManagement = [UserRole.MANAGER, UserRole.ADMIN].includes(actingUser.role);
    if (isManagement || isOwner) {
      return;
    }

    const requiredRole = LEVEL_ROLE[ticket.level];
    if (requiredRole && actingUser.role === requiredRole) {
      return;
    }

    throw new ForbiddenException('Você não tem permissão para conversar neste chamado');
  }

  private assertCanActOnLevel(ticket: Ticket, actingUser: JwtPayload): void {
    const isOwner = ticket.requester.id === actingUser.userId;
    const isManagement = [UserRole.MANAGER, UserRole.ADMIN].includes(actingUser.role);
    if (isManagement) {
      return;
    }

    if (ticket.level === 1) {
      if (isOwner || actingUser.role === UserRole.TECHNICIAN) {
        return;
      }
    } else {
      const requiredRole = LEVEL_ROLE[ticket.level];
      if (actingUser.role === requiredRole) {
        return;
      }
    }

    throw new ForbiddenException('Você não tem permissão para escalar este chamado');
  }

  private async notifyLevelAssignment(ticket: Ticket, level: number): Promise<void> {
    const role = LEVEL_ROLE[level];
    if (!role) {
      return;
    }

    const professionals = await this.usersService.findByRole(role);
    if (professionals.length === 0) {
      const managers = await this.usersService.findByRole(UserRole.MANAGER);
      await Promise.all(
        managers.map((manager) =>
          this.notificationsService.notifyQueueWaiting(manager.email, ticket.id, level),
        ),
      );
      return;
    }

    await Promise.all(
      professionals.map((professional) =>
        this.notificationsService.notifyTicketEscalated(
          professional.email,
          ticket.id,
          ticket.title,
          level,
        ),
      ),
    );
  }
}
