import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Hoisted mocks
const { mockUsePromotionSummary } = vi.hoisted(() => ({
  mockUsePromotionSummary: vi.fn(),
}));

vi.mock('../../src/api/summary', () => ({
  usePromotionSummary: (...args: any[]) => mockUsePromotionSummary(...args),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Import AFTER mocks are set up
import { PromotionSummary } from '../../src/components/PromotionSummary';

describe('PromotionSummary', () => {
  const wrapper = createWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUsePromotionSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<PromotionSummary />, { wrapper });
    expect(screen.getByLabelText('Cargando resumen')).toBeInTheDocument();
    expect(screen.getByText('Cargando resumen...')).toBeInTheDocument();
  });

  it('should render summary with data', async () => {
    mockUsePromotionSummary.mockReturnValue({
      data: {
        by_status: { Programada: 3, Activa: 5, Finalizada: 2 },
        valid_today: 3,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<PromotionSummary />, { wrapper });

    expect(screen.getByTestId('count-programada')).toHaveTextContent('3');
    expect(screen.getByTestId('count-activa')).toHaveTextContent('5');
    expect(screen.getByTestId('count-finalizada')).toHaveTextContent('2');
    expect(screen.getByTestId('count-valid-today')).toHaveTextContent('3');
  });

  it('should render error state', () => {
    mockUsePromotionSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    });

    render(<PromotionSummary />, { wrapper });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('should render zero values correctly', () => {
    mockUsePromotionSummary.mockReturnValue({
      data: {
        by_status: { Programada: 0, Activa: 0, Finalizada: 0 },
        valid_today: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<PromotionSummary />, { wrapper });

    expect(screen.getByTestId('count-programada')).toHaveTextContent('0');
    expect(screen.getByTestId('count-valid-today')).toHaveTextContent('0');
  });

  it('should display summary title', () => {
    mockUsePromotionSummary.mockReturnValue({
      data: {
        by_status: { Programada: 1, Activa: 1, Finalizada: 0 },
        valid_today: 1,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<PromotionSummary />, { wrapper });
    expect(screen.getByText('Resumen de Promociones')).toBeInTheDocument();
  });

  it('should show all four summary cards', () => {
    mockUsePromotionSummary.mockReturnValue({
      data: {
        by_status: { Programada: 1, Activa: 2, Finalizada: 3 },
        valid_today: 2,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<PromotionSummary />, { wrapper });

    expect(screen.getByText('Programadas')).toBeInTheDocument();
    expect(screen.getByText('Activas')).toBeInTheDocument();
    expect(screen.getByText('Finalizadas')).toBeInTheDocument();
    expect(screen.getByText('Válidas Hoy')).toBeInTheDocument();
  });
});
