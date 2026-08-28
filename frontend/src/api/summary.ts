import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface PromotionSummary {
  by_status: {
    Programada: number;
    Activa: number;
    Finalizada: number;
  };
  valid_today: number;
}

export const SUMMARY_QUERY_KEY = ['promotions', 'summary'] as const;

export function usePromotionSummary() {
  return useQuery({
    queryKey: SUMMARY_QUERY_KEY,
    queryFn: () => api.get<PromotionSummary>('/promotions/summary'),
    staleTime: 30_000,
    refetchInterval: 60_000, // Refetch every minute for valid_today
  });
}
