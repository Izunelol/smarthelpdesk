import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTickets } from '../services/tickets';
import type { Ticket } from '../types';

export function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTickets()
      .then(setTickets)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="page-loading">Carregando chamados...</p>;
  }

  return (
    <div className="page">
      <h1>Meus chamados</h1>
      {tickets.length === 0 && <p>Você ainda não abriu nenhum chamado.</p>}
      <ul className="ticket-list">
        {tickets.map((ticket) => (
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
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
