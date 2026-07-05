import { api } from './api';
import type { ChatMessage, Ticket, TicketStatus } from '../types';

export interface CreateTicketPayload {
  title: string;
  description: string;
  categoryId?: string;
}

export interface TicketFilters {
  status?: TicketStatus;
  level?: number;
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const { data } = await api.post<Ticket>('/tickets', payload);
  return data;
}

export async function listTickets(filters: TicketFilters = {}): Promise<Ticket[]> {
  const { data } = await api.get<Ticket[]>('/tickets', { params: filters });
  return data;
}

export async function getTicket(id: string): Promise<Ticket> {
  const { data } = await api.get<Ticket>(`/tickets/${id}`);
  return data;
}

export async function escalateTicket(id: string, reason: string): Promise<Ticket> {
  const { data } = await api.patch<Ticket>(`/tickets/${id}/escalate`, { reason });
  return data;
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
  const { data } = await api.patch<Ticket>(`/tickets/${id}/status`, { status });
  return data;
}

export async function rateTicket(id: string, score: number, comment?: string): Promise<Ticket> {
  const { data } = await api.post<Ticket>(`/tickets/${id}/rating`, { score, comment });
  return data;
}

export async function listChatMessages(id: string): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>(`/tickets/${id}/messages`);
  return data;
}

export async function sendChatMessage(
  id: string,
  content: string,
): Promise<{ ticket: Ticket; messages: ChatMessage[] }> {
  const { data } = await api.post<{ ticket: Ticket; messages: ChatMessage[] }>(
    `/tickets/${id}/messages`,
    { content },
  );
  return data;
}
