import { IsString, MinLength } from 'class-validator';

export class EscalateTicketDto {
  @IsString()
  @MinLength(5)
  reason: string;
}
