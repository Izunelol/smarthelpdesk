import { api } from './api';
import type { PublicUser } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<string> {
  const { data } = await api.post<{ accessToken: string }>('/auth/login', payload);
  return data.accessToken;
}

export async function register(payload: RegisterPayload): Promise<PublicUser> {
  const { data } = await api.post<PublicUser>('/users', payload);
  return data;
}

export async function fetchMe(): Promise<PublicUser> {
  const { data } = await api.get<PublicUser>('/users/me');
  return data;
}
