import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { listTickets } from '../services/tickets';
import type { Ticket, TicketPriority, TicketStatus } from '../types';

const ROLE_LEVEL: Record<string, number> = {
  TECHNICIAN: 2,
  SPECIALIST: 3,
};

const PRIORITIES: TicketPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function byMostRecent(a: Ticket, b: Ticket): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function QueuePage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<number | ''>(
    user ? (ROLE_LEVEL[user.role] ?? '') : '',
  );
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [activeTab, setActiveTab] = useState<TicketPriority>('CRITICAL');

  useEffect(() => {
    setLoading(true);
    listTickets({
      level: levelFilter || undefined,
      status: statusFilter || undefined,
    })
      .then((data) => setTickets(data))
      .finally(() => setLoading(false));
  }, [levelFilter, statusFilter]);

  const ticketsInTab = tickets.filter((t) => t.priority === activeTab).sort(byMostRecent);

  return (
    <div className="page">
      <h1>Fila de atendimento</h1>
      <div className="filters">
        <label>
          Nível
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos</option>
            <option value={1}>Nível 1</option>
            <option value={2}>Nível 2</option>
            <option value={3}>Nível 3</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
          >
            <option value="">Todos</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </label>
      </div>
      <div className="priority-tabs">
        {PRIORITIES.map((priority) => {
          const count = tickets.filter((t) => t.priority === priority).length;
          return (
            <button
              key={priority}
              type="button"
              className={`priority-tab badge-priority-${priority.toLowerCase()}${
                activeTab === priority ? ' active' : ''
              }`}
              onClick={() => setActiveTab(priority)}
            >
              {priority} ({count})
            </button>
          );
        })}
      </div>
      {loading ? (
        <p className="page-loading">Carregando fila...</p>
      ) : (
        <ul className="ticket-list">
          {ticketsInTab.length === 0 && (
            <li>Nenhum chamado com prioridade {activeTab} para os filtros selecionados.</li>
          )}
          {ticketsInTab.map((ticket) => (
            <li key={ticket.id}>
              <Link to={`/tickets/${ticket.id}`}>
                <span className="ticket-title">{ticket.title}</span>
                <span className={`badge badge-status-${ticket.status.toLowerCase()}`}>
                  {ticket.status}
                </span>
                <span className="badge">Nível {ticket.level}</span>
                <span className={`badge badge-priority-${ticket.priority.toLowerCase()}`}>
                  {ticket.priority}
                </span>
                <span className="badge">{ticket.requester?.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
