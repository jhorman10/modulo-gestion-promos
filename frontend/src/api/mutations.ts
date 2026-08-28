import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Promotion } from './promotions';
import { PROMOTIONS_QUERY_KEY } from './promotions';
import { SUMMARY_QUERY_KEY } from './summary';

export interface CreatePromotionPayload {
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  product_ids: string[];
  category_ids: string[];
}

export interface UpdatePromotionPayload {
  name?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  start_date?: string;
  end_date?: string;
  product_ids?: string[];
  category_ids?: string[];
}

/**
 * Mutation hook to create a new promotion.
 * Invalidates promotions list and summary queries on success.
 */
export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePromotionPayload) => api.post<Promotion>('/promotions', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROMOTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook to update an existing promotion.
 * Invalidates promotions list and detail queries on success.
 */
export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePromotionPayload }) =>
      api.patch<Promotion>(`/promotions/${id}`, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: PROMOTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: [...PROMOTIONS_QUERY_KEY, 'detail', variables.id],
      });
    },
  });
}

/**
 * Mutation hook to soft-delete a promotion (only Programada).
 * Invalidates promotions list and summary queries on success.
 */
export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/promotions/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROMOTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook to activate a promotion (Programada → Activa).
 * Invalidates promotions list and summary queries on success.
 */
export function useActivatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Promotion>(`/promotions/${id}/activate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROMOTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook to finalize a promotion (Activa → Finalizada).
 * Invalidates promotions list and summary queries on success.
 */
export function useFinalizePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<Promotion>(`/promotions/${id}/finalize`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROMOTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY });
    },
  });
}
