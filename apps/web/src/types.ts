export type UserRole = 'USER' | 'TECHNICIAN' | 'SPECIALIST' | 'MANAGER' | 'ADMIN';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Attendance {
  id: string;
  description: string;
  startedAt: string;
  endedAt?: string | null;
  level: number;
  responsible: PublicUser;
}

export interface Rating {
  id: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  level: number;
  createdAt: string;
  closedAt?: string | null;
  requester: PublicUser;
  category: Category;
  attendances?: Attendance[];
  rating?: Rating | null;
}

export type ChatMessageSender = 'USER' | 'AI' | 'STAFF';

export interface ChatMessage {
  id: string;
  sender: ChatMessageSender;
  content: string;
  createdAt: string;
  senderUser?: PublicUser | null;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  updatedAt: string;
}
