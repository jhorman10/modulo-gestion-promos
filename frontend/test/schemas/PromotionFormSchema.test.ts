import { describe, it, expect } from 'vitest';
import { PromotionFormSchema, PromotionFormData } from '../../src/schemas/PromotionFormSchema';

describe('PromotionFormSchema', () => {
  const validBase = {
    name: 'Test Promotion',
    discount_type: 'percentage' as const,
    discount_value: 0.15,
    start_date: '2026-09-01T00:00:00Z',
    end_date: '2026-09-30T23:59:59Z',
    product_ids: ['550e8400-e29b-41d4-a716-446655440000'],
    category_ids: [],
  };

  describe('happy path', () => {
    it('should accept valid percentage promotion', () => {
      const result = PromotionFormSchema.safeParse(validBase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Promotion');
        expect(result.data.discount_type).toBe('percentage');
        expect(result.data.discount_value).toBe(0.15);
      }
    });

    it('should accept valid fixed promotion', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        discount_type: 'fixed',
        discount_value: 500,
      });
      expect(result.success).toBe(true);
    });

    it('should accept promotion with both products and categories', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        product_ids: ['550e8400-e29b-41d4-a716-446655440000'],
        category_ids: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('percentage boundaries', () => {
    it('should accept 0.01 (minimum percentage)', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        discount_value: 0.01,
      });
      expect(result.success).toBe(true);
    });

    it('should accept 1.00 (maximum percentage)', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        discount_value: 1.00,
      });
      expect(result.success).toBe(true);
    });

    it('should reject 0.005 (below minimum)', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        discount_value: 0.005,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const discountError = result.error.issues.find(
          (i) => i.path.includes('discount_value')
        );
        expect(discountError?.message).toContain('0.01');
      }
    });

    it('should reject 1.01 (above maximum)', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        discount_value: 1.01,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const discountError = result.error.issues.find(
          (i) => i.path.includes('discount_value')
        );
        expect(discountError?.message).toContain('1.00');
      }
    });
  });

  describe('fixed amount validation', () => {
    it('should accept fixed amount > 0', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        discount_type: 'fixed',
        discount_value: 500,
      });
      expect(result.success).toBe(true);
    });

    it('should reject fixed amount = 0', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        discount_type: 'fixed',
        discount_value: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject fixed amount < 0', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        discount_type: 'fixed',
        discount_value: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('date validation', () => {
    it('should reject end_date equal to start_date', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        start_date: '2026-09-01T00:00:00Z',
        end_date: '2026-09-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const dateError = result.error.issues.find(
          (i) => i.path.includes('end_date')
        );
        expect(dateError?.message).toContain('after');
      }
    });

    it('should reject end_date before start_date', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        start_date: '2026-09-15T00:00:00Z',
        end_date: '2026-09-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });

    it('should accept end_date after start_date', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        start_date: '2026-09-01T00:00:00Z',
        end_date: '2026-09-30T23:59:59Z',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject empty name', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing discount_type', () => {
      const { discount_type, ...rest } = validBase;
      const result = PromotionFormSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid discount_type', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        discount_type: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('association validation', () => {
    it('should reject when both product_ids and category_ids are empty', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        product_ids: [],
        category_ids: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const assocError = result.error.issues.find(
          (i) => i.path.includes('product_ids')
        );
        expect(assocError?.message).toContain('At least one');
      }
    });

    it('should accept when only product_ids provided', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        product_ids: ['550e8400-e29b-41d4-a716-446655440000'],
        category_ids: [],
      });
      expect(result.success).toBe(true);
    });

    it('should accept when only category_ids provided', () => {
      const result = PromotionFormSchema.safeParse({
        ...validBase,
        product_ids: [],
        category_ids: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('defaults', () => {
    it('should default product_ids and category_ids to empty arrays', () => {
      const { product_ids, category_ids, ...rest } = validBase;
      const result = PromotionFormSchema.safeParse({
        ...rest,
        product_ids: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.product_ids).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
        expect(result.data.category_ids).toEqual([]);
      }
    });
  });
});
