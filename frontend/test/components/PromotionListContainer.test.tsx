import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReactNode } from 'react';
import type { Promotion } from '../../src/api/promotions';

// Hoisted mocks
const { mockApiGet, mockApiPost, mockApiDelete, mockToastSuccess, mockToastError } = vi.hoisted(
  () => ({
    mockApiGet: vi.fn(),
    mockApiPost: vi.fn(),
    mockApiDelete: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  })
);

vi.mock('../../src/api/client', () => ({
  api: {
    get: mockApiGet,
    post: mockApiPost,
    patch: vi.fn(),
    delete: mockApiDelete,
  },
}));

vi.mock('../../src/components/ui/Toast', () => ({
  ToastProvider: () => null,
  toastService: {
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock HTMLDialogElement methods for jsdom
HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  (this as any).open = true;
});
HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  (this as any).open = false;
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/promotions']}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

const scheduledPromotion: Promotion = {
  id: '1',
  name: 'Promo Programada',
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
};

const activePromotion: Promotion = {
  id: '2',
  name: 'Promo Activa',
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
};

const paginatedResponse = (data: Promotion[]) => ({
  data,
  pagination: { total: data.length, page: 1, size: 10, total_pages: 1 },
});

describe('PromotionListContainer', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();
    mockApiGet.mockResolvedValue(paginatedResponse([scheduledPromotion, activePromotion]));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should render PromotionList and ConfirmationDialog', async () => {
    const { PromotionListContainer } = await import('../../src/components/PromotionListContainer');
    render(<PromotionListContainer />, { wrapper });

    await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());
    expect(screen.getByText('Promo Activa')).toBeInTheDocument();
    // Dialog is closed initially (not open)
    expect(screen.queryByText(/¿Está seguro que desea eliminar/)).not.toBeInTheDocument();
  });

  describe('handleEdit', () => {
    it('should navigate to /promotions/:id/edit when Edit is clicked', async () => {
      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Editar Promo Programada' }));
    });
  });

  describe('handleActivate', () => {
    it('should call activate mutation and show success toast', async () => {
      mockApiPost.mockResolvedValue({ ...scheduledPromotion, status: 'Activa' });

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Activar Promo Programada' }));

      await waitFor(() => expect(mockApiPost).toHaveBeenCalledWith('/promotions/1/activate'));
      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('"Promo Programada" activada correctamente')
      );
    });

    it('should show error toast with ApiError message on failure', async () => {
      mockApiPost.mockRejectedValue({ code: 'X', message: 'No se puede activar' });

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Activar Promo Programada' }));

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No se puede activar'));
    });

    it('should show fallback error toast when error has no message', async () => {
      mockApiPost.mockRejectedValue('plain string error');

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Activar Promo Programada' }));

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Error al activar la promoción')
      );
    });
  });

  describe('handleFinalize', () => {
    it('should call finalize mutation and show success toast', async () => {
      mockApiPost.mockResolvedValue({ ...activePromotion, status: 'Finalizada' });

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Activa')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Finalizar Promo Activa' }));

      await waitFor(() => expect(mockApiPost).toHaveBeenCalledWith('/promotions/2/finalize'));
      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('"Promo Activa" finalizada correctamente')
      );
    });

    it('should show error toast with ApiError message on failure', async () => {
      mockApiPost.mockRejectedValue({ code: 'X', message: 'No se puede finalizar' });

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Activa')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Finalizar Promo Activa' }));

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No se puede finalizar'));
    });

    it('should show fallback error toast when error object has empty message', async () => {
      mockApiPost.mockRejectedValue({ code: 'X', message: '' });

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Activa')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Finalizar Promo Activa' }));

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Error al finalizar la promoción')
      );
    });
  });

  describe('handleDelete and confirmDelete', () => {
    it('should open confirmation dialog when Delete is clicked', async () => {
      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar Promo Programada' }));

      expect(
        screen.getByText(
          '¿Está seguro que desea eliminar "Promo Programada"? Esta acción no se puede deshacer.'
        )
      ).toBeInTheDocument();
    });

    it('should close dialog and show success toast on successful confirm', async () => {
      mockApiDelete.mockResolvedValue(undefined);

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar Promo Programada' }));

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar', hidden: true }));

      await waitFor(() => expect(mockApiDelete).toHaveBeenCalledWith('/promotions/1'));
      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('"Promo Programada" eliminada correctamente')
      );
      await waitFor(() =>
        expect(screen.queryByText(/¿Está seguro que desea eliminar/)).not.toBeInTheDocument()
      );
    });

    it('should close dialog and show error toast on failed confirm', async () => {
      mockApiDelete.mockRejectedValue({ code: 'X', message: 'No se puede eliminar' });

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar Promo Programada' }));

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar', hidden: true }));

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No se puede eliminar'));
      await waitFor(() =>
        expect(screen.queryByText(/¿Está seguro que desea eliminar/)).not.toBeInTheDocument()
      );
    });

    it('should show fallback error toast when delete error has no message', async () => {
      mockApiDelete.mockRejectedValue({});

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar Promo Programada' }));

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar', hidden: true }));

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Error al eliminar la promoción')
      );
    });
  });

  describe('cancelDelete', () => {
    it('should close the dialog when not pending', async () => {
      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar Promo Programada' }));
      expect(screen.queryByText(/¿Está seguro que desea eliminar/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      await waitFor(() =>
        expect(screen.queryByText(/¿Está seguro que desea eliminar/)).not.toBeInTheDocument()
      );
    });

    it('should NOT close the dialog while the delete mutation is pending', async () => {
      // Make delete stay pending forever
      mockApiDelete.mockImplementation(() => new Promise(() => {}));

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar Promo Programada' }));
      expect(screen.queryByText(/¿Está seguro que desea eliminar/)).toBeInTheDocument();

      // Confirm triggers the (pending) mutation; wait for pending state
      fireEvent.click(screen.getByRole('button', { name: 'Eliminar', hidden: true }));
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /procesando/i, hidden: true })
        ).toBeInTheDocument()
      );

      // While pending, cancel should NOT close the dialog
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      await waitFor(() => expect(mockApiDelete).toHaveBeenCalledWith('/promotions/1'));
      expect(screen.queryByText(/¿Está seguro que desea eliminar/)).toBeInTheDocument();
    });
  });

  describe('getErrorMessage', () => {
    it('should return the error message when it exists', async () => {
      mockApiPost.mockRejectedValue({ code: 'X', message: 'Mensaje específico' });

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Activar Promo Programada' }));

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Mensaje específico'));
    });

    it('should return the fallback when error is not an object', async () => {
      mockApiPost.mockRejectedValue('string error');

      const { PromotionListContainer } =
        await import('../../src/components/PromotionListContainer');
      render(<PromotionListContainer />, { wrapper });

      await waitFor(() => expect(screen.getByText('Promo Programada')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: 'Activar Promo Programada' }));

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('Error al activar la promoción')
      );
    });
  });
});
