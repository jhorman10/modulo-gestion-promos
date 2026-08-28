/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect } from 'vitest';
import {
  createPromotionSchema,
  updatePromotionSchema,
  promotionParamsSchema,
  promotionQuerySchema,
} from '../../src/validators/promotion.validator';

describe('PromotionValidator', () => {
  describe('createPromotionSchema', () => {
    const validBasePayload = {
      name: 'Test Promotion',
      discount_type: 'percentage',
      discount_value: 0.15,
      start_date: '2026-09-01T00:00:00.000Z',
      end_date: '2026-09-30T23:59:59.000Z',
      product_ids: ['123e4567-e89b-12d3-a456-426614174000'],
      category_ids: [],
    };

    it('should accept valid percentage promotion with product association', () => {
      const result = createPromotionSchema.safeParse(validBasePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discount_type).toBe('percentage');
        expect(result.data.discount_value).toBe(0.15);
      }
    });

    it('should accept valid fixed amount promotion with category association', () => {
      const payload = {
        ...validBasePayload,
        discount_type: 'fixed' as const,
        discount_value: 500,
        product_ids: [],
        category_ids: ['123e4567-e89b-12d3-a456-426614174001'],
      };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discount_type).toBe('fixed');
        expect(result.data.discount_value).toBe(500);
      }
    });

    it('should accept percentage value at lower boundary (0.01 = 1%)', () => {
      const payload = { ...validBasePayload, discount_value: 0.01 };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept percentage value at upper boundary (1.00 = 100%)', () => {
      const payload = { ...validBasePayload, discount_value: 1.0 };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject percentage value below lower boundary (0.005)', () => {
      const payload = { ...validBasePayload, discount_value: 0.005 };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('discount_value'))).toBe(true);
      }
    });

    it('should reject percentage value above upper boundary (1.01)', () => {
      const payload = { ...validBasePayload, discount_value: 1.01 };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('discount_value'))).toBe(true);
      }
    });

    it('should reject fixed amount with zero or negative discount_value', () => {
      const payload = { ...validBasePayload, discount_type: 'fixed' as const, discount_value: 0 };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('discount_value'))).toBe(true);
      }
    });

    it('should reject fixed amount with negative discount_value', () => {
      const payload = {
        ...validBasePayload,
        discount_type: 'fixed' as const,
        discount_value: -100,
      };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject end_date equal to start_date', () => {
      const payload = {
        ...validBasePayload,
        start_date: '2026-09-01T00:00:00.000Z',
        end_date: '2026-09-01T00:00:00.000Z',
      };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('end_date'))).toBe(true);
      }
    });

    it('should reject end_date before start_date', () => {
      const payload = {
        ...validBasePayload,
        start_date: '2026-09-02T00:00:00.000Z',
        end_date: '2026-09-01T00:00:00.000Z',
      };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: name', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name, ...payload } = validBasePayload;
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: discount_type', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { discount_type, ...payload } = validBasePayload;
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: discount_value', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { discount_value, ...payload } = validBasePayload;
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: start_date', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { start_date, ...payload } = validBasePayload;
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject missing required field: end_date', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { end_date, ...payload } = validBasePayload;
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid discount_type enum value', () => {
      const payload = { ...validBasePayload, discount_type: 'invalid' };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject when both product_ids and category_ids are empty', () => {
      const payload = { ...validBasePayload, product_ids: [], category_ids: [] };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            e =>
              e.path.includes('product_ids') ||
              e.path.includes('category_ids') ||
              e.path.length === 0
          )
        ).toBe(true);
      }
    });

    it('should reject name longer than 200 characters', () => {
      const payload = { ...validBasePayload, name: 'a'.repeat(201) };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const payload = { ...validBasePayload, name: '' };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID in product_ids', () => {
      const payload = { ...validBasePayload, product_ids: ['not-a-uuid'] };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID in category_ids', () => {
      const payload = { ...validBasePayload, category_ids: ['not-a-uuid'] };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should accept valid ISO 8601 date formats', () => {
      const payload1 = {
        ...validBasePayload,
        start_date: '2026-09-01T10:30:00Z',
        end_date: '2026-09-30T10:30:00Z',
      };
      const payload2 = {
        ...validBasePayload,
        start_date: '2026-09-01T10:30:00.000Z',
        end_date: '2026-09-30T10:30:00.000Z',
      };

      expect(createPromotionSchema.safeParse(payload1).success).toBe(true);
      expect(createPromotionSchema.safeParse(payload2).success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const payload = { ...validBasePayload, start_date: '09/01/2026' };
      const result = createPromotionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePromotionSchema', () => {
    it('should accept partial update with only name', () => {
      const result = updatePromotionSchema.safeParse({ name: 'Updated Name' });
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only discount_value', () => {
      const result = updatePromotionSchema.safeParse({ discount_value: 0.2 });
      expect(result.success).toBe(true);
    });

    it('should reject percentage discount_value out of bounds in update', () => {
      const result = updatePromotionSchema.safeParse({
        discount_type: 'percentage',
        discount_value: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject fixed discount_value <= 0 in update', () => {
      const result = updatePromotionSchema.safeParse({
        discount_type: 'fixed',
        discount_value: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject end_date before start_date in update', () => {
      const result = updatePromotionSchema.safeParse({
        start_date: '2026-09-02T00:00:00.000Z',
        end_date: '2026-09-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject both product_ids and category_ids empty in update', () => {
      const result = updatePromotionSchema.safeParse({
        product_ids: [],
        category_ids: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('promotionParamsSchema', () => {
    it('should accept valid UUID param', () => {
      const result = promotionParamsSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID param', () => {
      const result = promotionParamsSchema.safeParse({ id: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('should reject missing id param', () => {
      const result = promotionParamsSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('promotionQuerySchema', () => {
    it('should accept default pagination', () => {
      const result = promotionQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.size).toBe(10);
      }
    });

    it('should accept custom pagination', () => {
      const result = promotionQuerySchema.safeParse({ page: '2', size: '20' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.size).toBe(20);
      }
    });

    it('should reject size exceeding maximum 100', () => {
      const result = promotionQuerySchema.safeParse({ size: '200' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('size'))).toBe(true);
      }
    });

    it('should reject page less than 1', () => {
      const result = promotionQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('should reject size less than 1', () => {
      const result = promotionQuerySchema.safeParse({ size: '0' });
      expect(result.success).toBe(false);
    });

    it('should accept status filter', () => {
      const result = promotionQuerySchema.safeParse({ status: 'Programada' });
      expect(result.success).toBe(true);
    });

    it('should accept product_id filter', () => {
      const result = promotionQuerySchema.safeParse({
        product_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept category_id filter', () => {
      const result = promotionQuerySchema.safeParse({
        category_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept date range filters', () => {
      const result = promotionQuerySchema.safeParse({
        start_date_from: '2026-09-01T00:00:00.000Z',
        end_date_to: '2026-09-30T23:59:59.000Z',
      });
      expect(result.success).toBe(true);
    });
  });
});
