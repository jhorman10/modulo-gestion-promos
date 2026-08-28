/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect } from 'vitest';
import { formatError, ErrorCode, createAppError } from '../../src/utils/errors';

describe('error formatter', () => {
  describe('formatError', () => {
    it('should produce RFC 7807 structure for validation error', () => {
      const result = formatError('VALIDATION_ERROR', 'Request validation failed', [
        { field: 'discount_value', message: 'Must be between 0.01 and 1.00' },
      ]);
      
      expect(result).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            { field: 'discount_value', message: 'Must be between 0.01 and 1.00' },
          ],
        },
      });
    });

    it('should produce RFC 7807 structure for state transition error', () => {
      const result = formatError('INVALID_STATE_TRANSITION', 'Only Programada promotions can be activated');
      
      expect(result).toEqual({
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: 'Only Programada promotions can be activated',
        },
      });
    });

    it('should produce RFC 7807 structure for not found error', () => {
      const result = formatError('NOT_FOUND', 'Promotion not found');
      
      expect(result).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Promotion not found',
        },
      });
    });

    it('should produce RFC 7807 structure for service unavailable error', () => {
      const result = formatError('SERVICE_UNAVAILABLE', 'Database connectivity check failed');
      
      expect(result).toEqual({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database connectivity check failed',
        },
      });
    });

    it('should produce RFC 7807 structure for internal error', () => {
      const result = formatError('INTERNAL_ERROR', 'An unexpected error occurred');
      
      expect(result).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should omit details when not provided', () => {
      const result = formatError('VALIDATION_ERROR', 'Request validation failed');
      
      expect(result).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
        },
      });
    });

    it('should omit details when empty array', () => {
      const result = formatError('VALIDATION_ERROR', 'Request validation failed', []);
      
      expect(result).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
        },
      });
    });
  });

  describe('ErrorCode enum', () => {
    it('should have all required error codes', () => {
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCode.INVALID_STATE_TRANSITION).toBe('INVALID_STATE_TRANSITION');
      expect(ErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
      expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });
  });

  describe('createAppError', () => {
    it('should create error with status code and code', () => {
      const error = createAppError('NOT_FOUND', 'Promotion not found', 404);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Promotion not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should create error with details', () => {
      const error = createAppError(
        'VALIDATION_ERROR', 
        'Validation failed', 
        400,
        [{ field: 'name', message: 'Name is required' }]
      );
      
      expect(error.details).toEqual([{ field: 'name', message: 'Name is required' }]);
    });
  });
});