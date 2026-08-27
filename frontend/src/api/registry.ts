import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface ProductCategory {
  id: string;
  name: string;
  type: 'PRODUCT' | 'CATEGORY';
}

export interface ProductsCategoriesResponse {
  products: ProductCategory[];
  categories: ProductCategory[];
  pagination: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
  };
}

export interface ProductsCategoriesParams {
  page?: number;
  size?: number;
  type?: 'PRODUCT' | 'CATEGORY';
}

export const REGISTRY_QUERY_KEY = ['products-categories'] as const;

export function registryQueryKey(params: ProductsCategoriesParams = {}) {
  return [...REGISTRY_QUERY_KEY, params] as const;
}

export function useProductsCategories(params: ProductsCategoriesParams = {}) {
  const { page = 1, size = 50, type } = params;

  return useQuery({
    queryKey: registryQueryKey({ page, size, type }),
    queryFn: () => api.get<ProductsCategoriesResponse>('/products-categories', { page, size, type }),
    staleTime: 5 * 60_000, // 5 minutes - registry data doesn't change often
  });
}

export function useProducts() {
  return useProductsCategories({ type: 'PRODUCT' });
}

export function useCategories() {
  return useProductsCategories({ type: 'CATEGORY' });
}