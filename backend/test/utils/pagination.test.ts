/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect } from 'vitest';
import { calculatePagination, paginationQuerySchema } from '../../src/utils/pagination';

describe('pagination utility', () => {
  describe('calculatePagination', () => {
    it('should calculate pagination correctly for first page', () => {
      const result = calculatePagination(1, 10, 45);
      expect(result).toEqual({
        total: 45,
        page: 1,
        size: 10,
        total_pages: 5,
      });
    });

    it('should calculate pagination correctly for middle page', () => {
      const result = calculatePagination(2, 20, 45);
      expect(result).toEqual({
        total: 45,
        page: 2,
        size: 20,
        total_pages: 3,
      });
    });

    it('should calculate pagination correctly for last page', () => {
      const result = calculatePagination(3, 20, 45);
      expect(result).toEqual({
        total: 45,
        page: 3,
        size: 20,
        total_pages: 3,
      });
    });

    it('should clamp size to maximum 100', () => {
      const result = calculatePagination(1, 200, 45);
      expect(result.size).toBe(100);
      expect(result.total_pages).toBe(1);
    });

    it('should handle exact division', () => {
      const result = calculatePagination(1, 10, 30);
      expect(result.total_pages).toBe(3);
    });

    it('should handle zero total', () => {
      const result = calculatePagination(1, 10, 0);
      expect(result).toEqual({
        total: 0,
        page: 1,
        size: 10,
        total_pages: 0,
      });
    });

    it('should default page to 1 when page is less than 1', () => {
      const result = calculatePagination(0, 10, 45);
      expect(result.page).toBe(1);
    });

    it('should default page to 1 when page is negative', () => {
      const result = calculatePagination(-5, 10, 45);
      expect(result.page).toBe(1);
    });
  });

  describe('paginationQuerySchema', () => {
    it('should validate valid query params', () => {
      const result = paginationQuerySchema.parse({ page: '2', size: '20' });
      expect(result).toEqual({ page: 2, size: 20 });
    });

    it('should use defaults when params not provided', () => {
      const result = paginationQuerySchema.parse({});
      expect(result).toEqual({ page: 1, size: 10 });
    });

    it('should reject page less than 1', () => {
      expect(() => paginationQuerySchema.parse({ page: '0' })).toThrow();
      expect(() => paginationQuerySchema.parse({ page: '-1' })).toThrow();
    });

    it('should reject size greater than 100', () => {
      expect(() => paginationQuerySchema.parse({ size: '101' })).toThrow();
      expect(() => paginationQuerySchema.parse({ size: '200' })).toThrow();
    });

    it('should reject size less than 1', () => {
      expect(() => paginationQuerySchema.parse({ size: '0' })).toThrow();
    });

    it('should coerce string numbers to integers', () => {
      const result = paginationQuerySchema.parse({ page: '3', size: '25' });
      expect(result.page).toBe(3);
      expect(result.size).toBe(25);
      expect(typeof result.page).toBe('number');
      expect(typeof result.size).toBe('number');
    });
  });
});
