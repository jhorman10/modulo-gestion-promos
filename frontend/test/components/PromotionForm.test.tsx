import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { Promotion } from '../../src/api/promotions';
import { ProductCategory } from '../../src/api/registry';

// Hoisted mocks
const { mockApiGet, mockApiPost, mockApiPatch, mockUsePromotion } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockApiPatch: vi.fn(),
  mockUsePromotion: vi.fn(),
}));

vi.mock('../../src/api/client', () => ({
  api: {
    get: mockApiGet,
    post: mockApiPost,
    patch: mockApiPatch,
    delete: vi.fn(),
  },
}));

vi.mock('../../src/api/promotions', () => ({
  usePromotion: (...args: any[]) => mockUsePromotion(...args),
  PROMOTIONS_QUERY_KEY: ['promotions'],
  promotionsQueryKey: (params: any) => ['promotions', params],
}));

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockProducts: ProductCategory[] = [
  { id: 'p1', name: 'Coca Cola 500ml', type: 'PRODUCT' },
  { id: 'p2', name: 'Pepsi 500ml', type: 'PRODUCT' },
];

const mockCategories: ProductCategory[] = [
  { id: 'c1', name: 'Bebidas', type: 'CATEGORY' },
  { id: 'c2', name: 'Snacks', type: 'CATEGORY' },
];

describe('PromotionForm', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for usePromotion (non-edit mode returns empty data)
    mockUsePromotion.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockApiGet
      .mockResolvedValueOnce({
        products: mockProducts,
        categories: mockCategories,
        pagination: { total: 4, page: 1, size: 50, total_pages: 1 },
      })
      .mockResolvedValueOnce({
        products: mockProducts,
        categories: mockCategories,
        pagination: { total: 4, page: 1, size: 50, total_pages: 1 },
      });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should render form with all required fields', async () => {
    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm />, { wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tipo de descuento/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/valor del descuento/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fecha de inicio/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fecha de fin/i)).toBeInTheDocument();
      expect(screen.getByText(/productos/i)).toBeInTheDocument();
      expect(screen.getByText(/categorías/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crear|crear promoción/i })).toBeInTheDocument();
    });
  });

  it('should show validation errors for required fields', async () => {
    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm />, { wrapper });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /crear|crear promoción/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /crear|crear promoción/i }));

    await waitFor(() => {
      expect(screen.getByText(/nombre es requerido|name is required/i)).toBeInTheDocument();
      // discount_type defaults to 'percentage' and discount_value defaults to 15,
      // so those validations pass with default values
      expect(
        screen.getByText(/fecha de inicio es requerida|start date is required/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/fecha de fin es requerida|end date is required/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/al menos un producto o categoría|at least one product or category/i)
      ).toBeInTheDocument();
    });
  });

  it('should validate percentage bounds (1 - 100)', async () => {
    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm />, { wrapper });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /crear|crear promoción/i })).toBeInTheDocument()
    );

    // Select percentage type
    fireEvent.click(screen.getByLabelText(/tipo de descuento/i));
    fireEvent.click(screen.getByRole('option', { name: /porcentaje/i }));

    // Enter invalid percentage (0.99)
    const discountValueInput = screen.getByLabelText(/valor del descuento/i);
    fireEvent.change(discountValueInput, { target: { value: '0.99' } });
    fireEvent.click(screen.getByRole('button', { name: /crear|crear promoción/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /porcentaje debe estar entre 1 y 100|percentage must be between 1 and 100/i
        )
      ).toBeInTheDocument()
    );

    // Enter invalid percentage (101)
    fireEvent.change(discountValueInput, { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: /crear|crear promoción/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /porcentaje debe estar entre 1 y 100|percentage must be between 1 and 100/i
        )
      ).toBeInTheDocument()
    );
  });

  it('should validate fixed amount > 0', async () => {
    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm />, { wrapper });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /crear|crear promoción/i })).toBeInTheDocument()
    );

    // Select fixed type
    fireEvent.click(screen.getByLabelText(/tipo de descuento/i));
    fireEvent.click(screen.getByRole('option', { name: /monto fijo/i }));

    // Enter invalid fixed amount (0)
    const discountValueInput = screen.getByLabelText(/valor del descuento/i);
    fireEvent.change(discountValueInput, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /crear|crear promoción/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/valor del descuento es requerido|discount value is required/i)
      ).toBeInTheDocument()
    );
  });

  it('should validate end_date after start_date', async () => {
    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm />, { wrapper });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /crear|crear promoción/i })).toBeInTheDocument()
    );

    const startDateInput = screen.getByLabelText(/fecha de inicio/i);
    const endDateInput = screen.getByLabelText(/fecha de fin/i);

    // Set end date before start date
    fireEvent.change(startDateInput, { target: { value: '2026-09-15T10:00' } });
    fireEvent.change(endDateInput, { target: { value: '2026-09-14T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /crear|crear promoción/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /fecha de fin debe ser posterior a fecha de inicio|end date must be after start date/i
        )
      ).toBeInTheDocument()
    );
  });

  it('should require at least one product or category', async () => {
    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm />, { wrapper });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /crear|crear promoción/i })).toBeInTheDocument()
    );

    // Fill all required fields but no products/categories
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Test Promo' } });
    fireEvent.click(screen.getByLabelText(/tipo de descuento/i));
    fireEvent.click(screen.getByRole('option', { name: /porcentaje/i }));
    fireEvent.change(screen.getByLabelText(/valor del descuento/i), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: '2026-09-01T10:00' },
    });
    fireEvent.change(screen.getByLabelText(/fecha de fin/i), {
      target: { value: '2026-09-30T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear|crear promoción/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/al menos un producto o categoría|at least one product or category/i)
      ).toBeInTheDocument()
    );
  });

  it('should submit form and call create mutation on valid data', async () => {
    const mockCreatedPromotion = {
      id: 'new-id',
      name: 'Test Promo',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-09-30T23:59:59Z',
      status: 'Programada',
      products: [mockProducts[0]],
      categories: [],
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      deleted_at: null,
    };
    mockApiPost.mockResolvedValue(mockCreatedPromotion);

    const onSuccess = vi.fn();
    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm onSuccess={onSuccess} />, { wrapper });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /crear|crear promoción/i })).toBeInTheDocument()
    );

    // Fill valid form
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Test Promo' } });
    fireEvent.click(screen.getByLabelText(/tipo de descuento/i));
    fireEvent.click(screen.getByRole('option', { name: /porcentaje/i }));
    fireEvent.change(screen.getByLabelText(/valor del descuento/i), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: '2026-09-01T10:00' },
    });
    fireEvent.change(screen.getByLabelText(/fecha de fin/i), {
      target: { value: '2026-09-30T10:00' },
    });

    // Select a product via multi-select
    const productsSelect = screen.getAllByRole('listbox')[0];
    const cocaOption = screen.getByRole('option', { name: /coca cola 500ml/i });
    cocaOption.selected = true;
    fireEvent.change(productsSelect);

    fireEvent.click(screen.getByRole('button', { name: /crear|crear promoción/i }));

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith(
        '/promotions',
        expect.objectContaining({
          name: 'Test Promo',
          discount_type: 'percentage',
          discount_value: 15,
          product_ids: ['p1'],
          category_ids: [],
        })
      )
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(mockCreatedPromotion));
  });

  it('should show loading state during submission', async () => {
    let resolveSubmit: (value: any) => void;
    const submitPromise = new Promise(resolve => {
      resolveSubmit = resolve;
    });
    mockApiPost.mockReturnValue(submitPromise);

    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm />, { wrapper });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /crear|crear promoción/i })).toBeInTheDocument()
    );

    // Fill valid form quickly
    fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Test Promo' } });
    fireEvent.click(screen.getByLabelText(/tipo de descuento/i));
    fireEvent.click(screen.getByRole('option', { name: /porcentaje/i }));
    fireEvent.change(screen.getByLabelText(/valor del descuento/i), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: '2026-09-01T10:00' },
    });
    fireEvent.change(screen.getByLabelText(/fecha de fin/i), {
      target: { value: '2026-09-30T10:00' },
    });
    const productsSelect2 = screen.getAllByRole('listbox')[0];
    const cocaOption2 = screen.getByRole('option', { name: /coca cola 500ml/i });
    cocaOption2.selected = true;
    fireEvent.change(productsSelect2);

    fireEvent.click(screen.getByRole('button', { name: /crear|crear promoción/i }));

    // Should show loading state
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /creando|creating/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /creando|creating/i })).toBeDisabled();

    // Resolve the promise
    resolveSubmit!({
      id: 'new-id',
      name: 'Test Promo',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-09-30T23:59:59Z',
      status: 'Programada',
      products: [mockProducts[0]],
      categories: [],
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      deleted_at: null,
    });

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /creando|creating/i })).not.toBeInTheDocument()
    );
  });

  it('should load existing promotion data in edit mode', async () => {
    const existingPromotion = {
      id: '1',
      name: 'Existing Promo',
      discount_type: 'percentage',
      discount_value: 20,
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-09-30T23:59:59Z',
      status: 'Programada',
      products: [mockProducts[0]],
      categories: [mockCategories[0]],
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      deleted_at: null,
    };

    mockUsePromotion.mockReturnValue({
      data: existingPromotion,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm promotionId="1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Promo')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /actualizar|update/i })).toBeInTheDocument();
    });
  });

  it('should submit update via PATCH in edit mode', async () => {
    const user = userEvent.setup();

    const existingPromotion = {
      id: '1',
      name: 'Existing Promo',
      discount_type: 'percentage',
      discount_value: 20,
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-09-30T23:59:59Z',
      status: 'Programada',
      products: [mockProducts[0]],
      categories: [mockCategories[0]],
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      deleted_at: null,
    };

    const updatedPromotion = { ...existingPromotion, name: 'Updated Promo' };

    mockUsePromotion.mockReturnValue({
      data: existingPromotion,
      isLoading: false,
      isError: false,
      error: null,
    });

    mockApiPatch.mockResolvedValue(updatedPromotion);

    const onSuccess = vi.fn();
    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm promotionId="1" onSuccess={onSuccess} />, { wrapper });

    await waitFor(() => expect(screen.getByDisplayValue('Existing Promo')).toBeInTheDocument());

    // Update the name using userEvent for proper react-hook-form integration
    const nameInput = screen.getByDisplayValue('Existing Promo');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Promo');

    // Click submit
    await user.click(screen.getByRole('button', { name: /actualizar|update/i }));

    await waitFor(() =>
      expect(mockApiPatch).toHaveBeenCalledWith(
        '/promotions/1',
        expect.objectContaining({
          name: 'Updated Promo',
        })
      )
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(updatedPromotion));
  });

  it('should show loading state when fetching promotion for edit', async () => {
    mockUsePromotion.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm promotionId="1" />, { wrapper });

    // Should show loading state
    await waitFor(() => expect(screen.getByText(/cargando|loading/i)).toBeInTheDocument());
  });

  it('should show error when promotion fetch fails in edit mode', async () => {
    mockUsePromotion.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Promotion not found'),
    });

    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm promotionId="999" />, { wrapper });

    await waitFor(() =>
      expect(screen.getByText(/error|no encontrado|not found/i)).toBeInTheDocument()
    );
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const { PromotionForm } = await import('../../src/components/PromotionForm');
    render(<PromotionForm onCancel={onCancel} />, { wrapper });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /crear|crear promoción/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar|cancel/i }));

    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });
});
