import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Hoisted mocks
const { mockApiPost, mockApiPatch, mockApiDelete } = vi.hoisted(() => ({
  mockApiPost: vi.fn(),
  mockApiPatch: vi.fn(),
  mockApiDelete: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
  api: {
    get: vi.fn(),
    post: mockApiPost,
    patch: mockApiPatch,
    delete: mockApiDelete,
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockPromotion = {
  id: '1',
  name: 'Test Promo',
  discount_type: 'percentage' as const,
  discount_value: 15,
  start_date: '2026-09-01T00:00:00Z',
  end_date: '2026-09-30T23:59:59Z',
  status: 'Programada' as const,
  products: [{ id: 'p1', name: 'Product 1', type: 'PRODUCT' as const }],
  categories: [],
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  deleted_at: null,
};

describe('useCreatePromotion', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should create a promotion and return the result', async () => {
    mockApiPost.mockResolvedValue(mockPromotion);

    const { useCreatePromotion } = await import('../../src/api/mutations');
    const { result } = renderHook(() => useCreatePromotion(), { wrapper });

    const payload = {
      name: 'Test Promo',
      discount_type: 'percentage' as const,
      discount_value: 15,
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-09-30T23:59:59Z',
      product_ids: ['p1'],
      category_ids: [],
    };

    await act(async () => {
      result.current.mutate(payload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiPost).toHaveBeenCalledWith('/promotions', payload);
    expect(result.current.data).toEqual(mockPromotion);
  });

  it('should handle creation error', async () => {
    mockApiPost.mockRejectedValue({ code: 'VALIDATION_ERROR', message: 'Invalid data' });

    const { useCreatePromotion } = await import('../../src/api/mutations');
    const { result } = renderHook(() => useCreatePromotion(), { wrapper });

    await act(async () => {
      result.current.mutate({
        name: '',
        discount_type: 'percentage',
        discount_value: 15,
        start_date: '2026-09-01T00:00:00Z',
        end_date: '2026-09-30T23:59:59Z',
        product_ids: ['p1'],
        category_ids: [],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ code: 'VALIDATION_ERROR', message: 'Invalid data' });
  });
});

describe('useUpdatePromotion', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should update a promotion and return the result', async () => {
    const updatedPromotion = { ...mockPromotion, name: 'Updated Promo' };
    mockApiPatch.mockResolvedValue(updatedPromotion);

    const { useUpdatePromotion } = await import('../../src/api/mutations');
    const { result } = renderHook(() => useUpdatePromotion(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: '1', data: { name: 'Updated Promo' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiPatch).toHaveBeenCalledWith('/promotions/1', { name: 'Updated Promo' });
    expect(result.current.data).toEqual(updatedPromotion);
  });
});

describe('useDeletePromotion', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should delete a promotion successfully', async () => {
    mockApiDelete.mockResolvedValue(undefined);

    const { useDeletePromotion } = await import('../../src/api/mutations');
    const { result } = renderHook(() => useDeletePromotion(), { wrapper });

    await act(async () => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiDelete).toHaveBeenCalledWith('/promotions/1');
  });

  it('should handle deletion error', async () => {
    mockApiDelete.mockRejectedValue({
      code: 'INVALID_STATE_TRANSITION',
      message: 'Cannot delete active promotion',
    });

    const { useDeletePromotion } = await import('../../src/api/mutations');
    const { result } = renderHook(() => useDeletePromotion(), { wrapper });

    await act(async () => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({
      code: 'INVALID_STATE_TRANSITION',
      message: 'Cannot delete active promotion',
    });
  });
});

describe('useActivatePromotion', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should activate a promotion and return updated status', async () => {
    const activatedPromotion = { ...mockPromotion, status: 'Activa' as const };
    mockApiPost.mockResolvedValue(activatedPromotion);

    const { useActivatePromotion } = await import('../../src/api/mutations');
    const { result } = renderHook(() => useActivatePromotion(), { wrapper });

    await act(async () => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiPost).toHaveBeenCalledWith('/promotions/1/activate');
    expect(result.current.data).toEqual(activatedPromotion);
  });

  it('should handle activation error (invalid state)', async () => {
    mockApiPost.mockRejectedValue({
      code: 'INVALID_STATE_TRANSITION',
      message: 'Only Programada promotions can be activated',
    });

    const { useActivatePromotion } = await import('../../src/api/mutations');
    const { result } = renderHook(() => useActivatePromotion(), { wrapper });

    await act(async () => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({
      code: 'INVALID_STATE_TRANSITION',
      message: 'Only Programada promotions can be activated',
    });
  });
});

describe('useFinalizePromotion', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should finalize a promotion and return updated status', async () => {
    const finalizedPromotion = { ...mockPromotion, status: 'Finalizada' as const };
    mockApiPost.mockResolvedValue(finalizedPromotion);

    const { useFinalizePromotion } = await import('../../src/api/mutations');
    const { result } = renderHook(() => useFinalizePromotion(), { wrapper });

    await act(async () => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiPost).toHaveBeenCalledWith('/promotions/1/finalize');
    expect(result.current.data).toEqual(finalizedPromotion);
  });

  it('should handle finalization error (invalid state)', async () => {
    mockApiPost.mockRejectedValue({
      code: 'INVALID_STATE_TRANSITION',
      message: 'Only Activa promotions can be finalized',
    });

    const { useFinalizePromotion } = await import('../../src/api/mutations');
    const { result } = renderHook(() => useFinalizePromotion(), { wrapper });

    await act(async () => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({
      code: 'INVALID_STATE_TRANSITION',
      message: 'Only Activa promotions can be finalized',
    });
  });
});
