import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { createArticle, listArticles } from '../services/knowledge';
import type { KnowledgeArticle } from '../types';

export function KnowledgeBasePage() {
  const { user } = useAuth();
  const canManage = user && ['TECHNICIAN', 'SPECIALIST', 'MANAGER', 'ADMIN'].includes(user.role);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [keywords, setKeywords] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  function load(q?: string) {
    setLoading(true);
    listArticles(q)
      .then(setArticles)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    load(query || undefined);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      await createArticle({
        title,
        content,
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      });
      setTitle('');
      setContent('');
      setKeywords('');
      load();
    } catch {
      setFormError('Não foi possível salvar o artigo.');
    }
  }

  return (
    <div className="page">
      <h1>Base de conhecimento</h1>
      <form className="search-form" onSubmit={handleSearch}>
        <input
          placeholder="Buscar artigos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {loading ? (
        <p className="page-loading">Carregando artigos...</p>
      ) : (
        <ul className="article-list">
          {articles.length === 0 && <li>Nenhum artigo encontrado.</li>}
          {articles.map((article) => (
            <li key={article.id}>
              <h3>{article.title}</h3>
              <p>{article.content}</p>
              {article.keywords.length > 0 && (
                <p className="keywords">Palavras-chave: {article.keywords.join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <section className="article-form">
          <h2>Novo artigo</h2>
          {formError && <p className="form-error">{formError}</p>}
          <form onSubmit={handleCreate}>
            <label>
              Título
              <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
            </label>
            <label>
              Conteúdo
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                minLength={10}
                rows={5}
              />
            </label>
            <label>
              Palavras-chave (separadas por vírgula)
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </label>
            <button type="submit">Salvar artigo</button>
          </form>
        </section>
      )}
    </div>
  );
}
