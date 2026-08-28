import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Hoisted mocks
const { mockApiGet, mockApiPost, mockApiPatch, mockApiDelete } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockApiPatch: vi.fn(),
  mockApiDelete: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
  api: {
    get: mockApiGet,
    post: mockApiPost,
    patch: mockApiPatch,
    delete: mockApiDelete,
  },
}));

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePromotions', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should fetch promotions with default pagination', async () => {
    const mockData = {
      data: [
        { id: '1', name: 'Promo 1', status: 'Programada' },
        { id: '2', name: 'Promo 2', status: 'Activa' },
      ],
      pagination: { total: 2, page: 1, size: 10, total_pages: 1 },
    };
    mockApiGet.mockResolvedValue(mockData);

    const { usePromotions } = await import('../../src/api/promotions');
    const { result } = renderHook(() => usePromotions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiGet).toHaveBeenCalledWith('/promotions', { page: 1, size: 10 });
    expect(result.current.data).toEqual(mockData);
  });

  it('should fetch promotions with custom pagination', async () => {
    const mockData = {
      data: [{ id: '1', name: 'Promo 1', status: 'Programada' }],
      pagination: { total: 15, page: 2, size: 5, total_pages: 3 },
    };
    mockApiGet.mockResolvedValue(mockData);

    const { usePromotions } = await import('../../src/api/promotions');
    const { result } = renderHook(() => usePromotions({ page: 2, size: 5 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiGet).toHaveBeenCalledWith('/promotions', { page: 2, size: 5 });
    expect(result.current.data).toEqual(mockData);
  });

  it('should handle error state', async () => {
    mockApiGet.mockRejectedValue({ code: 'INTERNAL_ERROR', message: 'Server error' });

    const { usePromotions } = await import('../../src/api/promotions');
    const { result } = renderHook(() => usePromotions(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Server error',
    });
  });
});

describe('usePromotionSummary', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should fetch promotion summary', async () => {
    const mockData = {
      by_status: { Programada: 3, Activa: 5, Finalizada: 2 },
      valid_today: 3,
    };
    mockApiGet.mockResolvedValue(mockData);

    const { usePromotionSummary } = await import('../../src/api/summary');
    const { result } = renderHook(() => usePromotionSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiGet).toHaveBeenCalledWith('/promotions/summary');
    expect(result.current.data).toEqual(mockData);
  });

  it('should handle empty summary', async () => {
    const mockData = {
      by_status: { Programada: 0, Activa: 0, Finalizada: 0 },
      valid_today: 0,
    };
    mockApiGet.mockResolvedValue(mockData);

    const { usePromotionSummary } = await import('../../src/api/summary');
    const { result } = renderHook(() => usePromotionSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
  });
});

describe('useProductsCategories', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should fetch products and categories', async () => {
    const mockData = {
      products: [{ id: '1', name: 'Product 1', type: 'PRODUCT' }],
      categories: [{ id: '2', name: 'Category 1', type: 'CATEGORY' }],
      pagination: { total: 2, page: 1, size: 50, total_pages: 1 },
    };
    mockApiGet.mockResolvedValue(mockData);

    const { useProductsCategories } = await import('../../src/api/registry');
    const { result } = renderHook(() => useProductsCategories(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiGet).toHaveBeenCalledWith('/products-categories', {
      page: 1,
      size: 50,
      type: undefined,
    });
    expect(result.current.data).toEqual(mockData);
  });

  it('should filter by type', async () => {
    const mockData = {
      products: [{ id: '1', name: 'Product 1', type: 'PRODUCT' }],
      categories: [],
      pagination: { total: 1, page: 1, size: 50, total_pages: 1 },
    };
    mockApiGet.mockResolvedValue(mockData);

    const { useProductsCategories } = await import('../../src/api/registry');
    const { result } = renderHook(() => useProductsCategories({ type: 'PRODUCT' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiGet).toHaveBeenCalledWith('/products-categories', {
      page: 1,
      size: 50,
      type: 'PRODUCT',
    });
  });
});
