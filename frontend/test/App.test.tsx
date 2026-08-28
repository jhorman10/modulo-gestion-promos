import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

// Hoisted mocks
const { mockApiGet } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
}));

vi.mock('../src/api/client', () => ({
  api: {
    get: mockApiGet,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, size: 10, total_pages: 0 } });
  });

  it('should render without crashing', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Promotions Management')).toBeInTheDocument();
  });

  it('should redirect / to /promotions', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Promotions Management')).toBeInTheDocument();
    });
  });

  it('should render navigation links', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('menuitem', { name: /promotions/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /new promotion/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /summary/i })).toBeInTheDocument();
  });

  it('should render summary page at /summary', async () => {
    mockApiGet.mockResolvedValue({
      by_status: { Programada: 0, Activa: 0, Finalizada: 0 },
      valid_today: 0,
    });

    render(
      <MemoryRouter initialEntries={['/summary']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Promotion Summary')).toBeInTheDocument();
    });
  });
});
