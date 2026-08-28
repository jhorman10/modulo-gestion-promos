import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReactNode } from 'react';
import { Promotion } from '../../src/api/promotions';

// Hoisted mocks
const { mockApiGet } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
  api: {
    get: mockApiGet,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Create a wrapper for React Query + Router
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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

const mockPromotions: Promotion[] = [
  {
    id: '1',
    name: 'Promo 1',
    discount_type: 'percentage',
    discount_value: 15,
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
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should render loading skeleton while fetching', async () => {
    mockApiGet.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({ data: [], pagination: { total: 0, page: 1, size: 10, total_pages: 0 } }),
            100
          )
        )
    );

    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList />, { wrapper });

    expect(screen.getByText(/cargando|loading/i)).toBeInTheDocument();
  });

  it('should render empty state when no promotions', async () => {
    mockApiGet.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, size: 10, total_pages: 0 },
    });

    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() =>
      expect(screen.getByText(/no hay promociones|no promotions/i)).toBeInTheDocument()
    );
  });

  it('should render error state when fetch fails', async () => {
    mockApiGet.mockRejectedValue({ code: 'INTERNAL_ERROR', message: 'Server error' });

    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText(/error|server error/i)).toBeInTheDocument());
  });

  it('should render promotions table with data', async () => {
    mockApiGet.mockResolvedValue({
      data: mockPromotions,
      pagination: { total: 2, page: 1, size: 10, total_pages: 1 },
    });

    const { PromotionList } = await import('../../src/components/PromotionList');
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

    const { PromotionList } = await import('../../src/components/PromotionList');
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

    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList />, { wrapper });

    // Wait for initial data to load
    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());

    // Now click next page
    const nextButton = screen.getByRole('button', { name: /siguiente|next/i });
    await waitFor(() => {
      nextButton.click();
    });

    // Should fetch page 2
    await waitFor(() =>
      expect(mockApiGet).toHaveBeenCalledWith('/promotions', { page: 2, size: 10 })
    );
  });

  it('should show Edit button for Programada promotions', async () => {
    mockApiGet.mockResolvedValue({
      data: [mockPromotions[0]],
      pagination: { total: 1, page: 1, size: 10, total_pages: 1 },
    });

    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /editar|edit/i })).toBeInTheDocument();
  });

  it('should show Delete button only for Programada promotions', async () => {
    mockApiGet.mockResolvedValue({
      data: mockPromotions,
      pagination: { total: 2, page: 1, size: 10, total_pages: 1 },
    });

    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());

    // Programada row should have delete button
    const deleteButtons = screen.getAllByRole('button', { name: /eliminar|delete/i });
    expect(deleteButtons).toHaveLength(1); // Only 1 (for Programada)
  });

  it('should show Activate button only for Programada promotions', async () => {
    mockApiGet.mockResolvedValue({
      data: mockPromotions,
      pagination: { total: 2, page: 1, size: 10, total_pages: 1 },
    });

    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());

    const activateButtons = screen.getAllByRole('button', { name: /activar|activate/i });
    expect(activateButtons).toHaveLength(1); // Only 1 (for Programada)
  });

  it('should show Finalize button only for Activa promotions', async () => {
    mockApiGet.mockResolvedValue({
      data: mockPromotions,
      pagination: { total: 2, page: 1, size: 10, total_pages: 1 },
    });

    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());

    const finalizeButtons = screen.getAllByRole('button', { name: /finalizar|finalize/i });
    expect(finalizeButtons).toHaveLength(1); // Only 1 (for Activa)
  });

  it('should not show action buttons for Finalizada promotions', async () => {
    const finalizedPromotion: Promotion = {
      id: '3',
      name: 'Finalized Promo',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-09-30T23:59:59Z',
      status: 'Finalizada',
      products: [],
      categories: [],
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      deleted_at: null,
    };
    mockApiGet.mockResolvedValue({
      data: [finalizedPromotion],
      pagination: { total: 1, page: 1, size: 10, total_pages: 1 },
    });

    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList />, { wrapper });

    await waitFor(() => expect(screen.getByText('Finalized Promo')).toBeInTheDocument());

    // Finalizada should not have edit, delete, activate, or finalize buttons
    expect(screen.queryByRole('button', { name: /editar|edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar|delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /activar|activate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /finalizar|finalize/i })).not.toBeInTheDocument();
  });

  it('should call onEdit when Edit button is clicked', async () => {
    mockApiGet.mockResolvedValue({
      data: [mockPromotions[0]],
      pagination: { total: 1, page: 1, size: 10, total_pages: 1 },
    });

    const onEdit = vi.fn();
    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList onEdit={onEdit} />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /editar|edit/i }));

    await waitFor(() => expect(onEdit).toHaveBeenCalledWith(mockPromotions[0]));
  });

  it('should call onActivate when Activate button is clicked', async () => {
    mockApiGet.mockResolvedValue({
      data: [mockPromotions[0]],
      pagination: { total: 1, page: 1, size: 10, total_pages: 1 },
    });

    const onActivate = vi.fn();
    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList onActivate={onActivate} />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /activar|activate/i }));

    await waitFor(() => expect(onActivate).toHaveBeenCalledWith(mockPromotions[0]));
  });

  it('should call onFinalize when Finalize button is clicked', async () => {
    mockApiGet.mockResolvedValue({
      data: [mockPromotions[1]],
      pagination: { total: 1, page: 1, size: 10, total_pages: 1 },
    });

    const onFinalize = vi.fn();
    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList onFinalize={onFinalize} />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo 2')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /finalizar|finalize/i }));

    await waitFor(() => expect(onFinalize).toHaveBeenCalledWith(mockPromotions[1]));
  });

  it('should call onDelete when Delete button is clicked', async () => {
    mockApiGet.mockResolvedValue({
      data: [mockPromotions[0]],
      pagination: { total: 1, page: 1, size: 10, total_pages: 1 },
    });

    const onDelete = vi.fn();
    const { PromotionList } = await import('../../src/components/PromotionList');
    render(<PromotionList onDelete={onDelete} />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /eliminar|delete/i }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(mockPromotions[0]));
  });
});
