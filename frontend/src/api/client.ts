import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export interface PaginationParams {
  page?: number;
  size?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - can add auth headers here
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );

  // Response interceptor - normalize error responses
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error.response?.data) {
        const apiError = error.response.data as { error?: ApiError };
        if (apiError.error) {
          return Promise.reject(apiError.error);
        }
      }

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return Promise.reject({
          code: 'TIMEOUT_ERROR',
          message: 'Tiempo de espera agotado - por favor intente de nuevo',
        } as ApiError);
      }

      if (!error.response) {
        return Promise.reject({
          code: 'NETWORK_ERROR',
          message: 'Error de red - por favor verifique su conexión',
        } as ApiError);
      }

      return Promise.reject({
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error inesperado',
      } as ApiError);
    }
  );

  return client;
};

export const apiClient = createApiClient();

export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
    const response = await apiClient.get<T>(url, { params });
    return response.data;
  },

  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await apiClient.post<T>(url, data);
    return response.data;
  },

  patch: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await apiClient.patch<T>(url, data);
    return response.data;
  },

  delete: async (url: string): Promise<void> => {
    await apiClient.delete(url);
  },
};
