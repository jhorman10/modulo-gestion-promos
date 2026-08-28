import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mock for axios
const { mockAxiosInstance, mockCreate } = vi.hoisted(() => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    mockAxiosInstance: mockInstance,
    mockCreate: vi.fn(() => mockInstance),
  };
});

vi.mock('axios', () => ({
  default: {
    create: mockCreate,
  },
  create: mockCreate,
}));

describe('apiClient', () => {
  let apiClient: any;
  let api: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset modules to re-run the client module with fresh mocks
    vi.resetModules();
    const clientModule = await import('../../src/api/client');
    apiClient = clientModule.apiClient;
    api = clientModule.api;
  });

  describe('configuration', () => {
    it('should create axios instance with correct baseURL', () => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: expect.stringContaining('/api'),
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should have request interceptor for adding auth headers', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });

    it('should have response interceptor for error handling', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('GET requests', () => {
    it('should call axios.get with correct URL and params', async () => {
      const mockResponse = {
        data: { data: [], pagination: { total: 0, page: 1, size: 10, total_pages: 0 } },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await api.get('/promotions', { page: 1, size: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/promotions', {
        params: { page: 1, size: 10 },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should call axios.get without params when not provided', async () => {
      const mockResponse = {
        data: { by_status: { Programada: 0, Activa: 0, Finalizada: 0 }, valid_today: 0 },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await api.get('/promotions/summary');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/promotions/summary', {
        params: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('POST requests', () => {
    it('should call axios.post with correct URL and data', async () => {
      const payload = { name: 'Test Promo', discount_type: 'percentage', discount_value: 0.15 };
      const mockResponse = { data: { id: '123', ...payload, status: 'Programada' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await api.post('/promotions', payload);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/promotions', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('PATCH requests', () => {
    it('should call axios.patch with correct URL and data', async () => {
      const payload = { name: 'Updated Promo' };
      const mockResponse = { data: { id: '123', ...payload, status: 'Programada' } };
      mockAxiosInstance.patch.mockResolvedValue(mockResponse);

      const result = await api.patch('/promotions/123', payload);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/promotions/123', payload);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('DELETE requests', () => {
    it('should call axios.delete with correct URL', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ status: 204, data: undefined });

      await api.delete('/promotions/123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/promotions/123');
    });
  });

  describe('Error interceptor', () => {
    it('should extract error response from axios error', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: [{ field: 'discount_value', message: 'Must be between 1 and 100' }],
            },
          },
          status: 400,
        },
        isAxiosError: true,
      };

      // Get the interceptor error handler (second argument)
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];

      await expect(responseInterceptor(errorResponse)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ field: 'discount_value', message: 'Must be between 1 and 100' }],
      });
    });

    it('should handle network errors without response', async () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        response: undefined,
      };

      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];

      await expect(responseInterceptor(networkError)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Error de red - por favor verifique su conexión',
      });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
        response: undefined,
      };

      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];

      await expect(responseInterceptor(timeoutError)).rejects.toMatchObject({
        code: 'TIMEOUT_ERROR',
        message: 'Tiempo de espera agotado - por favor intente de nuevo',
      });
    });
  });
});
