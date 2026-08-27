import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useFormValidation } from './useFormValidation';

const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be at least 18'),
});

type TestFormData = z.infer<typeof testSchema>;

describe('useFormValidation', () => {
  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useFormValidation(testSchema, { name: 'John', email: 'john@test.com', age: 25 })
      );

      expect(result.current.getValues('name')).toBe('John');
      expect(result.current.getValues('email')).toBe('john@test.com');
      expect(result.current.getValues('age')).toBe(25);
    });

    it('should initialize without default values', () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      // When no defaults provided, getValues returns undefined for unset fields
      expect(result.current.getValues('name')).toBeUndefined();
      expect(result.current.getValues('email')).toBeUndefined();
      expect(result.current.getValues('age')).toBeUndefined();
    });
  });

  describe('setValue and getValues', () => {
    it('should update field value with setValue', () => {
      const { result } = renderHook(() =>
        useFormValidation(testSchema, { name: 'John', email: 'john@test.com', age: 25 })
      );

      act(() => {
        result.current.setValue('name', 'Jane');
      });

      expect(result.current.getValues('name')).toBe('Jane');
    });

    it('should update multiple fields', () => {
      const { result } = renderHook(() =>
        useFormValidation(testSchema, { name: 'John', email: 'john@test.com', age: 25 })
      );

      act(() => {
        result.current.setValue('name', 'Jane');
        result.current.setValue('email', 'jane@test.com');
        result.current.setValue('age', 30);
      });

      expect(result.current.getValues()).toEqual({
        name: 'Jane',
        email: 'jane@test.com',
        age: 30,
      });
    });
  });

  describe('form state', () => {
    it('should expose formState with isDirty and isSubmitting', () => {
      const { result } = renderHook(() =>
        useFormValidation(testSchema, { name: 'John', email: 'john@test.com', age: 25 })
      );

      expect(typeof result.current.formState.isDirty).toBe('boolean');
      expect(typeof result.current.formState.isSubmitting).toBe('boolean');
      expect(result.current.formState.isDirty).toBe(false);
    });

    it('should provide register function', () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      expect(typeof result.current.register).toBe('function');
    });

    it('should provide handleSubmit function', () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      expect(typeof result.current.handleSubmit).toBe('function');
    });

    it('should provide watch function', () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      expect(typeof result.current.watch).toBe('function');
    });

    it('should provide setValue function', () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      expect(typeof result.current.setValue).toBe('function');
    });

    it('should provide reset function', () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      expect(typeof result.current.reset).toBe('function');
    });

    it('should provide getFieldError helper', () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      expect(typeof result.current.getFieldError).toBe('function');
    });

    it('should provide hasFieldError helper', () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      expect(typeof result.current.hasFieldError).toBe('function');
    });
  });

  describe('reset', () => {
    it('should reset form to default values', () => {
      const { result } = renderHook(() =>
        useFormValidation(testSchema, { name: 'John', email: 'john@test.com', age: 25 })
      );

      act(() => {
        result.current.setValue('name', 'Jane');
      });

      expect(result.current.getValues('name')).toBe('Jane');

      act(() => {
        result.current.reset({ name: 'John', email: 'john@test.com', age: 25 });
      });

      expect(result.current.getValues('name')).toBe('John');
    });
  });

  describe('error helpers return correct types', () => {
    it('getFieldError returns string or undefined', () => {
      const { result } = renderHook(() =>
        useFormValidation(testSchema, { name: 'John', email: 'john@test.com', age: 25 })
      );

      const error = result.current.getFieldError('name');
      // Before any validation, should be undefined
      expect(error === undefined || typeof error === 'string').toBe(true);
    });

    it('hasFieldError returns boolean', () => {
      const { result } = renderHook(() =>
        useFormValidation(testSchema, { name: 'John', email: 'john@test.com', age: 25 })
      );

      expect(typeof result.current.hasFieldError('name')).toBe('boolean');
    });
  });
});
