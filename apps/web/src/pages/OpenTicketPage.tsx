import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCategories } from '../services/categories';
import { createTicket } from '../services/tickets';
import type { Category } from '../types';

export function OpenTicketPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const ticket = await createTicket({
        title,
        description,
        categoryId: categoryId || undefined,
      });
      navigate(`/tickets/${ticket.id}`);
    } catch {
      setError('Não foi possível abrir o chamado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Abrir chamado</h1>
      <p className="hint">
        Descreva seu problema. Nossa IA sugere a categoria e a prioridade automaticamente, mas
        você pode ajustar a categoria se preferir. A prioridade é definida automaticamente pela IA.
      </p>
      {error && <p className="form-error">{error}</p>}
      <form className="ticket-form" onSubmit={handleSubmit}>
        <label>
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        </label>
        <label>
          Descrição
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            rows={6}
          />
        </label>
        <label>
          Categoria (opcional — a IA sugere se deixar em branco)
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Deixar a IA sugerir</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Abrir chamado'}
        </button>
      </form>
    </div>
  );
}
