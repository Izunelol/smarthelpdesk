import { api } from './api';
import type { Category } from '../types';

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}
