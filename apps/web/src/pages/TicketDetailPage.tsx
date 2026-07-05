import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  escalateTicket,
  getTicket,
  listChatMessages,
  rateTicket,
  sendChatMessage,
  updateTicketStatus,
} from '../services/tickets';
import type { ChatMessage, Ticket } from '../types';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [score, setScore] = useState<number | ''>(5);
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    const data = await getTicket(id);
    setTicket(data);
  }, [id]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const chatIsOpenForUser =
    !!ticket &&
    !!user &&
    !['RESOLVED', 'CLOSED'].includes(ticket.status) &&
    (ticket.requester.id === user.id ||
      (ticket.level === 2 && user.role === 'TECHNICIAN') ||
      (ticket.level === 3 && user.role === 'SPECIALIST') ||
      ['MANAGER', 'ADMIN'].includes(user.role));

  useEffect(() => {
    if (!id || !chatIsOpenForUser) return;
    let cancelled = false;

    const poll = () => {
      listChatMessages(id)
        .then((data) => {
          if (!cancelled) setMessages(data);
        })
        .catch(() => {
          if (!cancelled) setChatError('Não foi possível carregar o histórico da conversa.');
        });
    };

    poll();
    const intervalId = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [id, chatIsOpenForUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loading) {
    return <p className="page-loading">Carregando chamado...</p>;
  }
  if (!ticket || !user) {
    return <p>Chamado não encontrado.</p>;
  }

  const isRequester = ticket.requester.id === user.id;
  const isStaff = ['TECHNICIAN', 'SPECIALIST', 'MANAGER', 'ADMIN'].includes(user.role);
  const canWorkOnTicket =
    isStaff &&
    ((ticket.level === 2 && user.role === 'TECHNICIAN') ||
      (ticket.level === 3 && user.role === 'SPECIALIST') ||
      ['MANAGER', 'ADMIN'].includes(user.role));
  const canOpenChat =
    ticket.level === 1 &&
    isRequester &&
    !['RESOLVED', 'CLOSED'].includes(ticket.status);
  const canChat =
    !['RESOLVED', 'CLOSED'].includes(ticket.status) && (isRequester || canWorkOnTicket);
  const canEscalate =
    ticket.level < 3 &&
    !['RESOLVED', 'CLOSED'].includes(ticket.status) &&
    (canOpenChat || canWorkOnTicket);
  const canResolve =
    !['RESOLVED', 'CLOSED'].includes(ticket.status) && (canOpenChat || canWorkOnTicket);
  const canRate =
    isRequester && ticket.status === 'RESOLVED' && !ticket.rating;

  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    if (!id || !chatInput.trim()) return;
    const content = chatInput.trim();
    setChatInput('');
    setChatError(null);
    setSendingMessage(true);
    try {
      const result = await sendChatMessage(id, content);
      setMessages((prev) => [...prev, ...result.messages]);
      setTicket(result.ticket);
    } catch {
      setChatError('Não foi possível enviar sua mensagem ao assistente.');
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleEscalate(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setActionError(null);
    try {
      await escalateTicket(id, reason);
      setReason('');
      await reload();
    } catch {
      setActionError('Não foi possível escalar o chamado.');
    }
  }

  async function handleResolve() {
    if (!id) return;
    setActionError(null);
    try {
      await updateTicketStatus(id, 'RESOLVED');
      await reload();
    } catch {
      setActionError('Não foi possível marcar como resolvido.');
    }
  }

  async function handleStart() {
    if (!id) return;
    setActionError(null);
    try {
      await updateTicketStatus(id, 'IN_PROGRESS');
      await reload();
    } catch {
      setActionError('Não foi possível iniciar o atendimento.');
    }
  }

  async function handleRate(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setActionError(null);
    try {
      await rateTicket(id, score === '' ? 0 : score, comment || undefined);
      await reload();
    } catch {
      setActionError('Não foi possível registrar a avaliação.');
    }
  }

  return (
    <div className="page ticket-detail">
      <h1>{ticket.title}</h1>
      <div className="ticket-meta">
        <span className={`badge badge-status-${ticket.status.toLowerCase()}`}>{ticket.status}</span>
        <span className="badge">Nível {ticket.level}</span>
        <span className={`badge badge-priority-${ticket.priority.toLowerCase()}`}>
          {ticket.priority}
        </span>
        <span className="badge">{ticket.category?.name}</span>
      </div>
      <p>{ticket.description}</p>
      {actionError && <p className="form-error">{actionError}</p>}

      {canChat && (
        <section className="chat-box">
          <h2>
            {ticket.level === 1
              ? 'Chat nível 1 — assistente'
              : `Chat com ${ticket.level === 2 ? 'o técnico' : 'o especialista'} responsável`}
          </h2>

          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">
                {ticket.level === 1
                  ? 'Envie uma mensagem para começar a conversa com o assistente.'
                  : 'Envie uma mensagem para começar a conversa.'}
              </p>
            )}
            {messages.map((message) => {
              const isMine = message.senderUser?.id === user.id;
              const bubbleClass =
                message.sender === 'AI'
                  ? 'chat-message-ai'
                  : isMine
                    ? 'chat-message-mine'
                    : 'chat-message-other';
              const senderLabel =
                message.sender === 'AI'
                  ? 'Assistente virtual'
                  : isMine
                    ? 'Você'
                    : (message.senderUser?.name ??
                      (message.sender === 'STAFF' ? 'Equipe técnica' : 'Solicitante'));
              return (
                <div key={message.id} className={`chat-message ${bubbleClass}`}>
                  <small className="chat-message-sender">{senderLabel}</small>
                  <span className="chat-message-content">{message.content}</span>
                  <small>{new Date(message.createdAt).toLocaleTimeString('pt-BR')}</small>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {chatError && <p className="form-error">{chatError}</p>}

          <form className="chat-form" onSubmit={handleSendMessage}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={sendingMessage}
              required
              minLength={1}
              maxLength={2000}
            />
            <button type="submit" disabled={sendingMessage}>
              {sendingMessage ? 'Enviando...' : 'Enviar'}
            </button>
          </form>

        </section>
      )}

      <section className="timeline">
        <h2>Histórico de atendimento</h2>
        <ul>
          {(ticket.attendances ?? []).map((attendance) => (
            <li key={attendance.id}>
              <strong>Nível {attendance.level}</strong> — {attendance.description}
              <br />
              <small>
                {attendance.responsible?.name} em{' '}
                {new Date(attendance.startedAt).toLocaleString('pt-BR')}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section className="ticket-actions">
        {canWorkOnTicket && ticket.status === 'ESCALATED' && (
          <button type="button" onClick={handleStart}>
            Iniciar atendimento
          </button>
        )}
        {canResolve && (
          <button type="button" onClick={handleResolve}>
            Marcar como resolvido
          </button>
        )}
        {canEscalate && (
          <form onSubmit={handleEscalate}>
            <label>
              Motivo da escalada
              <input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} />
            </label>
            <button type="submit">Escalar para o próximo nível</button>
          </form>
        )}
      </section>

      {canRate && (
        <section className="rating-box">
          <h2>Avaliar atendimento</h2>
          <form onSubmit={handleRate}>
            <label>
              Nota (1 a 5)
              <input
                type="number"
                min={1}
                max={5}
                value={score}
                onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
            <label>
              Comentário
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            </label>
            <button type="submit">Enviar avaliação</button>
          </form>
        </section>
      )}

      {ticket.rating && (
        <section className="rating-box">
          <h2>Avaliação registrada</h2>
          <p>Nota: {ticket.rating.score}/5</p>
          {ticket.rating.comment && <p>{ticket.rating.comment}</p>}
        </section>
      )}
    </div>
  );
}
