import { api } from './api';
import type { KnowledgeArticle } from '../types';

export interface ArticlePayload {
  title: string;
  content: string;
  keywords?: string[];
}

export async function listArticles(query?: string): Promise<KnowledgeArticle[]> {
  const { data } = await api.get<KnowledgeArticle[]>('/knowledge', {
    params: query ? { q: query } : undefined,
  });
  return data;
}

export async function createArticle(payload: ArticlePayload): Promise<KnowledgeArticle> {
  const { data } = await api.post<KnowledgeArticle>('/knowledge', payload);
  return data;
}

export async function updateArticle(
  id: string,
  payload: Partial<ArticlePayload>,
): Promise<KnowledgeArticle> {
  const { data } = await api.put<KnowledgeArticle>(`/knowledge/${id}`, payload);
  return data;
}

export async function deleteArticle(id: string): Promise<void> {
  await api.delete(`/knowledge/${id}`);
}
