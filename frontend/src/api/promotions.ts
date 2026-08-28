import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface Promotion {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  status: 'Programada' | 'Activa' | 'Finalizada';
  products: Array<{ id: string; name: string; type: 'PRODUCT' }>;
  categories: Array<{ id: string; name: string; type: 'CATEGORY' }>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PaginatedPromotionsResponse {
  data: Promotion[];
  pagination: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
  };
}

export interface PromotionListParams {
  page?: number;
  size?: number;
}

export const PROMOTIONS_QUERY_KEY = ['promotions'] as const;

export function promotionsQueryKey(params: PromotionListParams = {}) {
  return [...PROMOTIONS_QUERY_KEY, params] as const;
}

export function usePromotions(params: PromotionListParams = {}) {
  const { page = 1, size = 10 } = params;

  return useQuery({
    queryKey: promotionsQueryKey({ page, size }),
    queryFn: () => api.get<PaginatedPromotionsResponse>('/promotions', { page, size }),
    staleTime: 30_000,
  });
}

export function usePromotion(id: string) {
  return useQuery({
    queryKey: [...PROMOTIONS_QUERY_KEY, 'detail', id],
    queryFn: () => api.get<Promotion>(`/promotions/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}
