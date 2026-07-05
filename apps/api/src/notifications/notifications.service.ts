import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<string>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.from = user ?? 'no-reply@smarthelpdesk.local';

    if (!host || !user || !pass) {
      this.logger.warn('SMTP não configurado; notificações serão apenas logadas');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port ?? 587),
      secure: Number(port ?? 587) === 465,
      auth: { user, pass },
    });
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[e-mail simulado] Para: ${message.to} | ${message.subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${message.to}: ${err}`);
    }
  }

  notifyTicketCreated(to: string, ticketId: string, title: string): Promise<void> {
    return this.send({
      to,
      subject: `Chamado #${ticketId} aberto`,
      text: `Seu chamado "${title}" foi registrado e está em análise no nível 1.`,
    });
  }

  notifyTicketEscalated(to: string, ticketId: string, title: string, level: number): Promise<void> {
    return this.send({
      to,
      subject: `Chamado #${ticketId} escalado para o nível ${level}`,
      text: `O chamado "${title}" foi escalado para o nível ${level} de atendimento.`,
    });
  }

  notifyQueueWaiting(to: string, ticketId: string, level: number): Promise<void> {
    return this.send({
      to,
      subject: `Chamado #${ticketId} aguardando em fila`,
      text: `Não há profissionais disponíveis no nível ${level} no momento. O chamado está em fila.`,
    });
  }

  notifyStatusChanged(to: string, ticketId: string, title: string, status: string): Promise<void> {
    return this.send({
      to,
      subject: `Chamado #${ticketId} atualizado`,
      text: `O chamado "${title}" mudou de status para ${status}.`,
    });
  }
}
