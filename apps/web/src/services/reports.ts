import { api } from './api';

export interface DashboardData {
  totalTickets: number;
  byStatus: { status: string; count: number }[];
  byLevel: { level: number; count: number }[];
  byPriority: { priority: string; count: number }[];
  averageResolutionHours: number | null;
  averageSatisfaction: number | null;
}

export interface ForecastData {
  projection: {
    category: string;
    history: { period: string; count: number }[];
    nextWeekProjection: number;
  }[];
  summary: string;
}

export interface BottlenecksData {
  perLevel: {
    level: number;
    averageHours: number | null;
    attendances: number;
    ticketsWaiting: number;
  }[];
  summary: string;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/reports/dashboard');
  return data;
}

export async function fetchForecast(): Promise<ForecastData> {
  const { data } = await api.get<ForecastData>('/reports/forecast');
  return data;
}

export async function fetchBottlenecks(): Promise<BottlenecksData> {
  const { data } = await api.get<BottlenecksData>('/reports/bottlenecks');
  return data;
}
