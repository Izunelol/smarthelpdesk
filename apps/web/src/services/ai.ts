import { api } from './api';

export async function fetchSuggestions(ticketId: string): Promise<string[]> {
  const { data } = await api.get<{ suggestions: string[] }>(`/ai/suggestions/${ticketId}`);
  return data.suggestions;
}
