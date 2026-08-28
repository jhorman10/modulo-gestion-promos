/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/main';
import { PromotionService } from '../../src/services/promotion.service';
import { ProductCategoryService } from '../../src/services/product-category.service';
import { HealthService } from '../../src/services/health.service';
import { prisma } from '../../src/prisma/client';
import { ProductCategoryType } from '@prisma/client';

describe('POST /api/promotions integration', () => {
  let app: any;
  let testRunId: number;

  beforeAll(async () => {
    const healthService = new HealthService();
    const productCategoryService = new ProductCategoryService();
    const promotionService = new PromotionService();

    app = createApp({ healthService, productCategoryService, promotionService });
    testRunId = Date.now();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const uniqueName = (base: string) =>
    `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

  // Create test products and categories
  let testProductId: string;
  let testCategoryId: string;

  beforeEach(async () => {
    // Clean up test data - use raw delete to bypass soft delete middleware
    await prisma.$executeRaw`DELETE FROM "promotion_products_categories"`;
    await prisma.$executeRaw`DELETE FROM "promotions"`;
    await prisma.$executeRaw`DELETE FROM "products_categories"`;

    // Create test products and categories
    const product = await prisma.productCategory.create({
      data: { name: uniqueName('Test Product'), type: ProductCategoryType.PRODUCT },
    });
    testProductId = product.id;

    const category = await prisma.productCategory.create({
      data: { name: uniqueName('Test Category'), type: ProductCategoryType.CATEGORY },
    });
    testCategoryId = category.id;
  });

  const validPayload = {
    name: 'Test Promotion',
    discount_type: 'percentage',
    discount_value: 15,
    start_date: '2026-09-01T00:00:00.000Z',
    end_date: '2026-09-30T23:59:59.000Z',
    product_ids: [],
    category_ids: [],
  };

  describe('Happy path scenarios', () => {
    it('should create percentage promotion with product and category associations', async () => {
      const payload = {
        ...validPayload,
        product_ids: [testProductId],
        category_ids: [testCategoryId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'Test Promotion',
        discount_type: 'percentage',
        discount_value: 15,
        status: 'Programada',
        products: expect.arrayContaining([
          expect.objectContaining({ id: testProductId, type: 'PRODUCT' }),
        ]),
        categories: expect.arrayContaining([
          expect.objectContaining({ id: testCategoryId, type: 'CATEGORY' }),
        ]),
        deleted_at: null,
      });
      expect(response.body.start_date).toBe('2026-09-01T00:00:00.000Z');
      expect(response.body.end_date).toBe('2026-09-30T23:59:59.000Z');
    });

    it('should create fixed amount promotion', async () => {
      const payload = {
        ...validPayload,
        discount_type: 'fixed',
        discount_value: 500,
        product_ids: [testProductId],
        category_ids: [],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(201);

      expect(response.body.discount_type).toBe('fixed');
      expect(response.body.discount_value).toBe(500);
    });

    it('should accept percentage value at lower boundary (1)', async () => {
      const payload = {
        ...validPayload,
        discount_value: 1,
        product_ids: [testProductId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(201);

      expect(response.body.discount_value).toBe(1);
    });

    it('should accept percentage value at upper boundary (100)', async () => {
      const payload = {
        ...validPayload,
        discount_value: 100,
        product_ids: [testProductId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(201);

      expect(response.body.discount_value).toBe(100);
    });
  });

  describe('Error scenarios', () => {
    it('should reject percentage value below lower boundary (0.99)', async () => {
      const payload = {
        ...validPayload,
        discount_value: 0.99,
        product_ids: [testProductId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Request validation failed');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'body.discount_value' })])
      );
    });

    it('should reject percentage value above upper boundary (101)', async () => {
      const payload = {
        ...validPayload,
        discount_value: 101,
        product_ids: [testProductId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject end_date before start_date', async () => {
      const payload = {
        ...validPayload,
        start_date: '2026-09-02T00:00:00.000Z',
        end_date: '2026-09-01T00:00:00.000Z',
        product_ids: [testProductId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'body.end_date' })])
      );
    });

    it('should reject end_date equal to start_date', async () => {
      const payload = {
        ...validPayload,
        start_date: '2026-09-01T00:00:00.000Z',
        end_date: '2026-09-01T00:00:00.000Z',
        product_ids: [testProductId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required field: name', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name, ...payload } = validPayload;
      payload.product_ids = [testProductId];

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required field: discount_type', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { discount_type, ...payload } = validPayload;
      payload.product_ids = [testProductId];

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required field: discount_value', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { discount_value, ...payload } = validPayload;
      payload.product_ids = [testProductId];

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required field: start_date', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { start_date, ...payload } = validPayload;
      payload.product_ids = [testProductId];

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required field: end_date', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { end_date, ...payload } = validPayload;
      payload.product_ids = [testProductId];

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid discount_type enum value', async () => {
      const payload = {
        ...validPayload,
        discount_type: 'invalid',
        product_ids: [testProductId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject when both product_ids and category_ids are empty', async () => {
      const payload = {
        ...validPayload,
        product_ids: [],
        category_ids: [],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-existent product_id', async () => {
      const payload = {
        ...validPayload,
        product_ids: ['123e4567-e89b-12d3-a456-426614174999'], // non-existent
        category_ids: [],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Product or category not found');
    });

    it('should reject non-existent category_id', async () => {
      const payload = {
        ...validPayload,
        product_ids: [],
        category_ids: ['123e4567-e89b-12d3-a456-426614174999'], // non-existent
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Product or category not found');
    });

    it('should reject fixed amount with zero discount_value', async () => {
      const payload = {
        ...validPayload,
        discount_type: 'fixed',
        discount_value: 0,
        product_ids: [testProductId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject fixed amount with negative discount_value', async () => {
      const payload = {
        ...validPayload,
        discount_type: 'fixed',
        discount_value: -100,
        product_ids: [testProductId],
      };

      const response = await request(app).post('/api/promotions').send(payload).expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
