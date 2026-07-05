import { IsEnum } from 'class-validator';
import { TicketStatus } from '../ticket.entity';

export class UpdateStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
