/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/main';
import { PromotionService } from '../../src/services/promotion.service';
import { ProductCategoryService } from '../../src/services/product-category.service';
import { HealthService } from '../../src/services/health.service';
import { prisma } from '../../src/prisma/client';
import { ProductCategoryType, PromotionStatus } from '@prisma/client';

describe('GET /api/promotions integration', () => {
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

  beforeEach(async () => {
    // Clean up test data - use raw delete to bypass soft delete middleware
    await prisma.$executeRaw`DELETE FROM "promotion_products_categories"`;
    await prisma.$executeRaw`DELETE FROM "promotions"`;
    await prisma.$executeRaw`DELETE FROM "products_categories"`;
  });

  const uniqueName = (base: string) =>
    `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

  // Create test products and categories
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let testProductId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let testCategoryId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let testProductId2: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let testCategoryId2: string;

  beforeEach(async () => {
    const product = await prisma.productCategory.create({
      data: { name: uniqueName('Test Product'), type: ProductCategoryType.PRODUCT },
    });
    testProductId = product.id;

    const category = await prisma.productCategory.create({
      data: { name: uniqueName('Test Category'), type: ProductCategoryType.CATEGORY },
    });
    testCategoryId = category.id;

    const product2 = await prisma.productCategory.create({
      data: { name: uniqueName('Test Product 2'), type: ProductCategoryType.PRODUCT },
    });
    testProductId2 = product2.id;

    const category2 = await prisma.productCategory.create({
      data: { name: uniqueName('Test Category 2'), type: ProductCategoryType.CATEGORY },
    });
    testCategoryId2 = category2.id;
  });

  // Helper to create a promotion directly in DB
  async function createPromotion(
    overrides: Partial<{
      name: string;
      discount_type: 'percentage' | 'fixed';
      discount_value: number;
      start_date: string;
      end_date: string;
      status: 'Programada' | 'Activa' | 'Finalizada';
      product_ids: string[];
      category_ids: string[];
      deleted_at: Date | null;
    }> = {}
  ) {
    const statusMap: Record<string, PromotionStatus> = {
      Programada: PromotionStatus.PROGRAMADA,
      Activa: PromotionStatus.ACTIVA,
      Finalizada: PromotionStatus.FINALIZADA,
    };

    // Create product/category if not provided
    const productIds = overrides.product_ids || [];
    const categoryIds = overrides.category_ids || [];

    const finalProductIds = [...productIds];
    const finalCategoryIds = [...categoryIds];

    if (finalProductIds.length === 0 && finalCategoryIds.length === 0) {
      // Create a default product if none provided
      const product = await prisma.productCategory.create({
        data: { name: uniqueName('Default Product'), type: ProductCategoryType.PRODUCT },
      });
      finalProductIds.push(product.id);
    }

    const promotion = await prisma.promotion.create({
      data: {
        name: overrides.name || 'Test Promotion',
        discountType: overrides.discount_type === 'fixed' ? 'FIXED' : 'PERCENTAGE',
        discountValue: overrides.discount_value || 15,
        startDate: new Date(overrides.start_date || '2026-01-01T00:00:00.000Z'),
        endDate: new Date(overrides.end_date || '2026-12-31T23:59:59.000Z'),
        status: statusMap[overrides.status || 'Programada'],
        deletedAt: overrides.deleted_at ?? null,
      },
    });

    if (finalProductIds.length > 0) {
      await prisma.promotionProductCategory.createMany({
        data: finalProductIds.map(productId => ({
          promotionId: promotion.id,
          productCategoryId: productId,
          associationType: ProductCategoryType.PRODUCT,
        })),
      });
    }

    if (finalCategoryIds.length > 0) {
      await prisma.promotionProductCategory.createMany({
        data: finalCategoryIds.map(categoryId => ({
          promotionId: promotion.id,
          productCategoryId: categoryId,
          associationType: ProductCategoryType.CATEGORY,
        })),
      });
    }

    return promotion;
  }

  describe('Happy path - pagination', () => {
    beforeEach(async () => {
      // Create 15 promotions for pagination tests
      for (let i = 0; i < 15; i++) {
        await createPromotion({
          name: `Promotion ${i + 1}`,
          start_date: `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
          end_date: `2026-09-${String(i + 1).padStart(2, '0')}T23:59:59.000Z`,
        });
      }
    });

    it('should return first page with default size (10)', async () => {
      const response = await request(app).get('/api/promotions').expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        total: 15,
        page: 1,
        size: 10,
        total_pages: 2,
      });
      // Should be ordered by created_at desc
      expect(response.body.data[0].name).toBe('Promotion 15');
    });

    it('should return second page with custom size', async () => {
      const response = await request(app).get('/api/promotions?page=2&size=5').expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination).toEqual({
        total: 15,
        page: 2,
        size: 5,
        total_pages: 3,
      });
      // Should be items 6-10 (created_at desc, so Promotion 10 to Promotion 6)
      expect(response.body.data[0].name).toBe('Promotion 10');
    });

    it('should return empty array for page beyond total pages', async () => {
      const response = await request(app).get('/api/promotions?page=10').expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination).toEqual({
        total: 15,
        page: 10,
        size: 10,
        total_pages: 2,
      });
    });

    it('should reject size exceeding maximum 100', async () => {
      const response = await request(app).get('/api/promotions?size=200').expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Filters', () => {
    beforeEach(async () => {
      // Create promotions with different statuses using the helper
      await createPromotion({
        name: 'Promo Programada 1',
        status: 'Programada',
      });
      await createPromotion({
        name: 'Promo Programada 2',
        status: 'Programada',
      });
      await createPromotion({
        name: 'Promo Activa 1',
        status: 'Activa',
      });
      await createPromotion({
        name: 'Promo Finalizada 1',
        status: 'Finalizada',
      });
    });

    it('should filter by status Programada', async () => {
      const response = await request(app).get('/api/promotions?status=Programada').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(p => p.status === 'Programada')).toBe(true);
    });

    it('should filter by status Activa', async () => {
      const response = await request(app).get('/api/promotions?status=Activa').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('Activa');
    });

    it('should filter by status Finalizada', async () => {
      const response = await request(app).get('/api/promotions?status=Finalizada').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('Finalizada');
    });

    it('should filter by product_id', async () => {
      // Create a promotion with a known product
      const product = await prisma.productCategory.create({
        data: { name: uniqueName('Filter Product'), type: ProductCategoryType.PRODUCT },
      });
      await createPromotion({
        product_ids: [product.id],
      });
      await createPromotion({
        // Another promotion with different product
      });

      const response = await request(app)
        .get(`/api/promotions?product_id=${product.id}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data.every(p => p.products.some(prod => prod.id === product.id))).toBe(
        true
      );
    });

    it('should filter by category_id', async () => {
      // Create a promotion with a known category
      const category = await prisma.productCategory.create({
        data: { name: uniqueName('Filter Category'), type: ProductCategoryType.CATEGORY },
      });
      await createPromotion({
        category_ids: [category.id],
      });
      await createPromotion({
        // Another promotion with different category
      });

      const response = await request(app)
        .get(`/api/promotions?category_id=${category.id}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].categories.some(cat => cat.id === category.id)).toBe(true);
    });

    it('should filter by start_date_from', async () => {
      // Create promotions with different start dates
      await createPromotion({ name: 'Promo 1', start_date: '2026-09-01T00:00:00.000Z' });
      await createPromotion({ name: 'Promo 2', start_date: '2026-09-02T00:00:00.000Z' });
      await createPromotion({ name: 'Promo 3', start_date: '2026-09-03T00:00:00.000Z' });
      await createPromotion({ name: 'Promo 4', start_date: '2026-09-01T00:00:00.000Z' });

      const response = await request(app)
        .get('/api/promotions?start_date_from=2026-09-02T00:00:00.000Z')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      // All should have start_date >= 2026-09-02
      expect(
        response.body.data.every(
          p => new Date(p.start_date) >= new Date('2026-09-02T00:00:00.000Z')
        )
      ).toBe(true);
    });

    it('should filter by end_date_to', async () => {
      // Create promotions with different end dates
      await createPromotion({ name: 'Promo 1', end_date: '2026-09-01T23:59:59.000Z' });
      await createPromotion({ name: 'Promo 2', end_date: '2026-09-02T23:59:59.000Z' });
      await createPromotion({ name: 'Promo 3', end_date: '2026-09-03T23:59:59.000Z' });
      await createPromotion({ name: 'Promo 4', end_date: '2026-09-30T23:59:59.000Z' });

      const response = await request(app)
        .get('/api/promotions?end_date_to=2026-09-02T23:59:59.000Z')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      // All should have end_date <= 2026-09-02
      expect(
        response.body.data.every(p => new Date(p.end_date) <= new Date('2026-09-02T23:59:59.000Z'))
      ).toBe(true);
    });
  });

  describe('Soft delete exclusion', () => {
    it('should exclude soft-deleted promotions from list', async () => {
      await createPromotion({ name: 'Active Promo', status: 'Programada' });
      await createPromotion({
        name: 'Deleted Promo',
        status: 'Programada',
        deleted_at: new Date(),
      });

      const response = await request(app).get('/api/promotions').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Active Promo');
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('Response format', () => {
    it('should include products and categories in response', async () => {
      const product1 = await prisma.productCategory.create({
        data: { name: uniqueName('Resp Product 1'), type: ProductCategoryType.PRODUCT },
      });
      const product2 = await prisma.productCategory.create({
        data: { name: uniqueName('Resp Product 2'), type: ProductCategoryType.PRODUCT },
      });
      const category = await prisma.productCategory.create({
        data: { name: uniqueName('Resp Category'), type: ProductCategoryType.CATEGORY },
      });
      await createPromotion({
        product_ids: [product1.id, product2.id],
        category_ids: [category.id],
      });

      const response = await request(app).get('/api/promotions').expect(200);

      expect(response.body.data).toHaveLength(1);
      const promo = response.body.data[0];
      expect(promo.products).toHaveLength(2);
      expect(promo.categories).toHaveLength(1);
      expect(promo.products[0].type).toBe('PRODUCT');
      expect(promo.categories[0].type).toBe('CATEGORY');
    });

    it('should return deleted_at as null for non-deleted promotions', async () => {
      await createPromotion({ status: 'Programada' });

      const response = await request(app).get('/api/promotions').expect(200);

      expect(response.body.data[0].deleted_at).toBeNull();
    });
  });
});
