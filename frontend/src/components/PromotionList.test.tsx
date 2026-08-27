import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { Promotion } from '../api/promotions';

// Hoisted mocks
const { mockApiGet } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
}));

vi.mock('../api/client', () => ({
  api: {
    get: mockApiGet,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

const mockPromotions: Promotion[] = [
  {
    id: '1',
    name: 'Promo 1',
    discount_type: 'percentage',
    discount_value: 0.15,
    start_date: '2026-09-01T00:00:00Z',
    end_date: '2026-09-30T23:59:59Z',
    status: 'Programada',
    products: [{ id: 'p1', name: 'Product 1', type: 'PRODUCT' }],
    categories: [],
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    deleted_at: null,
  },
  {
    id: '2',
    name: 'Promo 2',
    discount_type: 'fixed',
    discount_value: 500,
    start_date: '2026-09-01T00:00:00Z',
    end_date: '2026-09-30T23:59:59Z',
    status: 'Activa',
    products: [],
    categories: [{ id: 'c1', name: 'Category 1', type: 'CATEGORY' }],
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    deleted_at: null,
  },
];

describe('PromotionList', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should render loading skeleton while fetching', async () => {
    mockApiGet.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ data: [], pagination: { total: 0, page: 1, size: 10, total_pages: 0 } }), 100)));

    const { PromotionList } = await import('../components/PromotionList');
    render(<PromotionList />, { wrapper });

    expect(screen.getByText(/cargando|loading/i)).toBeInTheDocument();
  });

  it('should render empty state when no promotions', async () => {
    mockApiGet.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, size: 10, total_pages: 0 } });

    const { PromotionList } = await import('../components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText(/no hay promociones|no promotions/i)).toBeInTheDocument());
  });

  it('should render error state when fetch fails', async () => {
    mockApiGet.mockRejectedValue({ code: 'INTERNAL_ERROR', message: 'Server error' });

    const { PromotionList } = await import('../components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText(/error|server error/i)).toBeInTheDocument());
  });

  it('should render promotions table with data', async () => {
    mockApiGet.mockResolvedValue({
      data: mockPromotions,
      pagination: { total: 2, page: 1, size: 10, total_pages: 1 },
    });

    const { PromotionList } = await import('../components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());
    expect(screen.getByText('Promo 2')).toBeInTheDocument();
    expect(screen.getByText('Programada')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('should render pagination controls', async () => {
    mockApiGet.mockResolvedValue({
      data: mockPromotions,
      pagination: { total: 15, page: 1, size: 10, total_pages: 2 },
    });

    const { PromotionList } = await import('../components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText(/página 1 de 2|page 1 of 2/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /siguiente|next/i })).toBeInTheDocument();
  });

  it('should call onPageChange when page changes', async () => {
    // First render with page 1
    mockApiGet.mockResolvedValue({
      data: mockPromotions,
      pagination: { total: 15, page: 1, size: 10, total_pages: 2 },
    });

    const { PromotionList } = await import('../components/PromotionList');
    render(<PromotionList />, { wrapper });

    // Wait for initial data to load
    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());
    
    // Now click next page
    const nextButton = screen.getByRole('button', { name: /siguiente|next/i });
    await waitFor(() => {
      nextButton.click();
    });

    // Should fetch page 2
    await waitFor(() => expect(mockApiGet).toHaveBeenCalledWith('/promotions', { page: 2, size: 10 }));
  });
});