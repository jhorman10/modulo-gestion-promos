/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/main';
import { PromotionService } from '../../src/services/promotion.service';
import { ProductCategoryService } from '../../src/services/product-category.service';
import { HealthService } from '../../src/services/health.service';
import { prisma } from '../../src/prisma/client';
import { ProductCategoryType, PromotionStatus } from '@prisma/client';

describe('GET /api/promotions/:id integration', () => {
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
    await prisma.$executeRaw`DELETE FROM "promotion_products_categories"`;
    await prisma.$executeRaw`DELETE FROM "promotions"`;
    await prisma.$executeRaw`DELETE FROM "products_categories"`;
  });

  const uniqueName = (base: string) =>
    `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

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

    const productIds = overrides.product_ids || [];
    const categoryIds = overrides.category_ids || [];

    const finalProductIds = [...productIds];
    const finalCategoryIds = [...categoryIds];

    if (finalProductIds.length === 0 && finalCategoryIds.length === 0) {
      const product = await prisma.productCategory.create({
        data: { name: uniqueName('Default Product'), type: ProductCategoryType.PRODUCT },
      });
      finalProductIds.push(product.id);
    }

    const promotion = await prisma.promotion.create({
      data: {
        name: overrides.name || 'Test Promotion',
        discountType: overrides.discount_type === 'fixed' ? 'FIXED' : 'PERCENTAGE',
        discountValue: overrides.discount_value || 0.15,
        startDate: new Date(overrides.start_date || '2026-09-01T00:00:00.000Z'),
        endDate: new Date(overrides.end_date || '2026-09-30T23:59:59.000Z'),
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

  it('should return promotion with associations when found', async () => {
    const product = await prisma.productCategory.create({
      data: { name: uniqueName('Get Product'), type: ProductCategoryType.PRODUCT },
    });
    const category = await prisma.productCategory.create({
      data: { name: uniqueName('Get Category'), type: ProductCategoryType.CATEGORY },
    });

    const promotion = await createPromotion({
      product_ids: [product.id],
      category_ids: [category.id],
    });

    const response = await request(app).get(`/api/promotions/${promotion.id}`).expect(200);

    expect(response.body).toMatchObject({
      id: promotion.id,
      name: 'Test Promotion',
      discount_type: 'percentage',
      discount_value: 0.15,
      status: 'Programada',
      products: expect.arrayContaining([
        expect.objectContaining({ id: product.id, type: 'PRODUCT' }),
      ]),
      categories: expect.arrayContaining([
        expect.objectContaining({ id: category.id, type: 'CATEGORY' }),
      ]),
      deleted_at: null,
    });
  });

  it('should return 404 when promotion not found', async () => {
    const response = await request(app)
      .get('/api/promotions/123e4567-e89b-12d3-a456-426614174000')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBe('Promotion not found');
  });

  it('should return 404 for soft-deleted promotion', async () => {
    const promotion = await createPromotion({
      status: 'Programada',
      deleted_at: new Date(),
    });

    const response = await request(app).get(`/api/promotions/${promotion.id}`).expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should return promotion with only products', async () => {
    const product = await prisma.productCategory.create({
      data: { name: uniqueName('Only Product'), type: ProductCategoryType.PRODUCT },
    });

    const promotion = await createPromotion({
      product_ids: [product.id],
      category_ids: [],
    });

    const response = await request(app).get(`/api/promotions/${promotion.id}`).expect(200);

    expect(response.body.products).toHaveLength(1);
    expect(response.body.categories).toHaveLength(0);
  });

  it('should return promotion with only categories', async () => {
    const category = await prisma.productCategory.create({
      data: { name: uniqueName('Only Category'), type: ProductCategoryType.CATEGORY },
    });

    const promotion = await createPromotion({
      product_ids: [],
      category_ids: [category.id],
    });

    const response = await request(app).get(`/api/promotions/${promotion.id}`).expect(200);

    expect(response.body.products).toHaveLength(0);
    expect(response.body.categories).toHaveLength(1);
  });

  it('should return fixed amount promotion correctly', async () => {
    const promotion = await createPromotion({
      discount_type: 'fixed',
      discount_value: 500,
    });

    const response = await request(app).get(`/api/promotions/${promotion.id}`).expect(200);

    expect(response.body.discount_type).toBe('fixed');
    expect(response.body.discount_value).toBe(500);
  });
});

describe('PATCH /api/promotions/:id integration', () => {
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
    await prisma.$executeRaw`DELETE FROM "promotion_products_categories"`;
    await prisma.$executeRaw`DELETE FROM "promotions"`;
    await prisma.$executeRaw`DELETE FROM "products_categories"`;
  });

  const uniqueName = (base: string) =>
    `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

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
    }> = {}
  ) {
    const statusMap: Record<string, PromotionStatus> = {
      Programada: PromotionStatus.PROGRAMADA,
      Activa: PromotionStatus.ACTIVA,
      Finalizada: PromotionStatus.FINALIZADA,
    };

    const productIds = overrides.product_ids || [];
    const categoryIds = overrides.category_ids || [];

    const finalProductIds = [...productIds];
    const finalCategoryIds = [...categoryIds];

    if (finalProductIds.length === 0 && finalCategoryIds.length === 0) {
      const product = await prisma.productCategory.create({
        data: { name: uniqueName('Default Product'), type: ProductCategoryType.PRODUCT },
      });
      finalProductIds.push(product.id);
    }

    const promotion = await prisma.promotion.create({
      data: {
        name: overrides.name || 'Test Promotion',
        discountType: overrides.discount_type === 'fixed' ? 'FIXED' : 'PERCENTAGE',
        discountValue: overrides.discount_value || 0.15,
        startDate: new Date(overrides.start_date || '2026-09-01T00:00:00.000Z'),
        endDate: new Date(overrides.end_date || '2026-09-30T23:59:59.000Z'),
        status: statusMap[overrides.status || 'Programada'],
        deletedAt: null,
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

  it('should update promotion name when status is Programada', async () => {
    const promotion = await createPromotion({ status: 'Programada' });

    const response = await request(app)
      .patch(`/api/promotions/${promotion.id}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(response.body.name).toBe('Updated Name');
  });

  it('should update promotion discount_value when status is Activa', async () => {
    const promotion = await createPromotion({ status: 'Activa' });

    const response = await request(app)
      .patch(`/api/promotions/${promotion.id}`)
      .send({ discount_value: 0.25 })
      .expect(200);

    expect(response.body.discount_value).toBe(0.25);
  });

  it('should return 409 when updating Finalizada promotion', async () => {
    const promotion = await createPromotion({ status: 'Finalizada' });

    const response = await request(app)
      .patch(`/api/promotions/${promotion.id}`)
      .send({ name: 'Updated Name' })
      .expect(409);

    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(response.body.error.message).toContain('Finalizada');
  });

  it('should return 404 when promotion not found', async () => {
    const response = await request(app)
      .patch('/api/promotions/123e4567-e89b-12d3-a456-426614174000')
      .send({ name: 'Updated Name' })
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should update associations when provided', async () => {
    const product = await prisma.productCategory.create({
      data: { name: uniqueName('Update Product'), type: ProductCategoryType.PRODUCT },
    });
    const promotion = await createPromotion();

    const response = await request(app)
      .patch(`/api/promotions/${promotion.id}`)
      .send({ product_ids: [product.id], category_ids: [] })
      .expect(200);

    expect(response.body.products).toHaveLength(1);
    expect(response.body.products[0].id).toBe(product.id);
  });

  it('should reject invalid discount_value for percentage', async () => {
    const promotion = await createPromotion({ status: 'Programada' });

    const response = await request(app)
      .patch(`/api/promotions/${promotion.id}`)
      .send({ discount_type: 'percentage', discount_value: 1.5 })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/promotions/:id/activate integration', () => {
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
    await prisma.$executeRaw`DELETE FROM "promotion_products_categories"`;
    await prisma.$executeRaw`DELETE FROM "promotions"`;
    await prisma.$executeRaw`DELETE FROM "products_categories"`;
  });

  const uniqueName = (base: string) =>
    `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

  async function createPromotion(
    overrides: Partial<{
      name: string;
      discount_type: 'percentage' | 'fixed';
      discount_value: number;
      start_date: string;
      end_date: string;
      status: 'Programada' | 'Activa' | 'Finalizada';
    }> = {}
  ) {
    const statusMap: Record<string, PromotionStatus> = {
      Programada: PromotionStatus.PROGRAMADA,
      Activa: PromotionStatus.ACTIVA,
      Finalizada: PromotionStatus.FINALIZADA,
    };

    const product = await prisma.productCategory.create({
      data: { name: uniqueName('Act Product'), type: ProductCategoryType.PRODUCT },
    });

    const promotion = await prisma.promotion.create({
      data: {
        name: overrides.name || 'Test Promotion',
        discountType: overrides.discount_type === 'fixed' ? 'FIXED' : 'PERCENTAGE',
        discountValue: overrides.discount_value || 0.15,
        startDate: new Date(overrides.start_date || '2026-08-01T00:00:00.000Z'),
        endDate: new Date(overrides.end_date || '2026-08-30T23:59:59.000Z'),
        status: statusMap[overrides.status || 'Programada'],
        deletedAt: null,
      },
    });

    await prisma.promotionProductCategory.createMany({
      data: [
        {
          promotionId: promotion.id,
          productCategoryId: product.id,
          associationType: ProductCategoryType.PRODUCT,
        },
      ],
    });

    return promotion;
  }

  it('should activate promotion when status is Programada and date is within range', async () => {
    const promotion = await createPromotion({ status: 'Programada' });

    const response = await request(app)
      .post(`/api/promotions/${promotion.id}/activate`)
      .expect(200);

    expect(response.body.status).toBe('Activa');
  });

  it('should return 409 when promotion is not Programada (Activa)', async () => {
    const promotion = await createPromotion({ status: 'Activa' });

    const response = await request(app)
      .post(`/api/promotions/${promotion.id}/activate`)
      .expect(409);

    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(response.body.error.message).toContain('Programada');
  });

  it('should return 409 when promotion is Finalizada', async () => {
    const promotion = await createPromotion({ status: 'Finalizada' });

    const response = await request(app)
      .post(`/api/promotions/${promotion.id}/activate`)
      .expect(409);

    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('should return 409 when current date is before start_date', async () => {
    const promotion = await createPromotion({
      status: 'Programada',
      start_date: '2026-10-01T00:00:00.000Z',
      end_date: '2026-10-30T23:59:59.000Z',
    });

    const response = await request(app)
      .post(`/api/promotions/${promotion.id}/activate`)
      .expect(409);

    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(response.body.error.message).toContain('validity period');
  });

  it('should return 409 when current date is after end_date', async () => {
    const promotion = await createPromotion({
      status: 'Programada',
      start_date: '2026-07-01T00:00:00.000Z',
      end_date: '2026-07-30T23:59:59.000Z',
    });

    const response = await request(app)
      .post(`/api/promotions/${promotion.id}/activate`)
      .expect(409);

    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(response.body.error.message).toContain('validity period');
  });

  it('should return 404 when promotion not found', async () => {
    const response = await request(app)
      .post('/api/promotions/123e4567-e89b-12d3-a456-426614174000/activate')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/promotions/:id/finalize integration', () => {
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
    await prisma.$executeRaw`DELETE FROM "promotion_products_categories"`;
    await prisma.$executeRaw`DELETE FROM "promotions"`;
    await prisma.$executeRaw`DELETE FROM "products_categories"`;
  });

  const uniqueName = (base: string) =>
    `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

  async function createPromotion(
    overrides: Partial<{
      status: 'Programada' | 'Activa' | 'Finalizada';
    }> = {}
  ) {
    const statusMap: Record<string, PromotionStatus> = {
      Programada: PromotionStatus.PROGRAMADA,
      Activa: PromotionStatus.ACTIVA,
      Finalizada: PromotionStatus.FINALIZADA,
    };

    const product = await prisma.productCategory.create({
      data: { name: uniqueName('Fin Product'), type: ProductCategoryType.PRODUCT },
    });

    const promotion = await prisma.promotion.create({
      data: {
        name: 'Test Promotion',
        discountType: 'PERCENTAGE',
        discountValue: 0.15,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        status: statusMap[overrides.status || 'Activa'],
        deletedAt: null,
      },
    });

    await prisma.promotionProductCategory.createMany({
      data: [
        {
          promotionId: promotion.id,
          productCategoryId: product.id,
          associationType: ProductCategoryType.PRODUCT,
        },
      ],
    });

    return promotion;
  }

  it('should finalize promotion when status is Activa', async () => {
    const promotion = await createPromotion({ status: 'Activa' });

    const response = await request(app)
      .post(`/api/promotions/${promotion.id}/finalize`)
      .expect(200);

    expect(response.body.status).toBe('Finalizada');
  });

  it('should return 409 when promotion is Programada', async () => {
    const promotion = await createPromotion({ status: 'Programada' });

    const response = await request(app)
      .post(`/api/promotions/${promotion.id}/finalize`)
      .expect(409);

    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(response.body.error.message).toContain('Activa');
  });

  it('should return 409 when promotion is already Finalizada', async () => {
    const promotion = await createPromotion({ status: 'Finalizada' });

    const response = await request(app)
      .post(`/api/promotions/${promotion.id}/finalize`)
      .expect(409);

    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('should return 404 when promotion not found', async () => {
    const response = await request(app)
      .post('/api/promotions/123e4567-e89b-12d3-a456-426614174000/finalize')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /api/promotions/:id integration', () => {
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
    await prisma.$executeRaw`DELETE FROM "promotion_products_categories"`;
    await prisma.$executeRaw`DELETE FROM "promotions"`;
    await prisma.$executeRaw`DELETE FROM "products_categories"`;
  });

  const uniqueName = (base: string) =>
    `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

  async function createPromotion(
    overrides: Partial<{
      status: 'Programada' | 'Activa' | 'Finalizada';
    }> = {}
  ) {
    const statusMap: Record<string, PromotionStatus> = {
      Programada: PromotionStatus.PROGRAMADA,
      Activa: PromotionStatus.ACTIVA,
      Finalizada: PromotionStatus.FINALIZADA,
    };

    const product = await prisma.productCategory.create({
      data: { name: uniqueName('Del Product'), type: ProductCategoryType.PRODUCT },
    });

    const promotion = await prisma.promotion.create({
      data: {
        name: 'Test Promotion',
        discountType: 'PERCENTAGE',
        discountValue: 0.15,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        status: statusMap[overrides.status || 'Programada'],
        deletedAt: null,
      },
    });

    await prisma.promotionProductCategory.createMany({
      data: [
        {
          promotionId: promotion.id,
          productCategoryId: product.id,
          associationType: ProductCategoryType.PRODUCT,
        },
      ],
    });

    return promotion;
  }

  it('should soft delete promotion when status is Programada', async () => {
    const promotion = await createPromotion({ status: 'Programada' });

    await request(app).delete(`/api/promotions/${promotion.id}`).expect(204);

    // Verify it's excluded from list
    const listResponse = await request(app).get('/api/promotions').expect(200);

    expect(listResponse.body.data).toHaveLength(0);
  });

  it('should return 409 when promotion is Activa', async () => {
    const promotion = await createPromotion({ status: 'Activa' });

    const response = await request(app).delete(`/api/promotions/${promotion.id}`).expect(409);

    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(response.body.error.message).toContain('Programada');
  });

  it('should return 409 when promotion is Finalizada', async () => {
    const promotion = await createPromotion({ status: 'Finalizada' });

    const response = await request(app).delete(`/api/promotions/${promotion.id}`).expect(409);

    expect(response.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('should return 404 when promotion not found', async () => {
    const response = await request(app)
      .delete('/api/promotions/123e4567-e89b-12d3-a456-426614174000')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should exclude soft-deleted promotion from summary', async () => {
    await createPromotion({ status: 'Programada' });
    const promotion = await createPromotion({ status: 'Programada' });

    // Delete one
    await request(app).delete(`/api/promotions/${promotion.id}`).expect(204);

    // Check summary
    const summaryResponse = await request(app).get('/api/promotions/summary').expect(200);

    expect(summaryResponse.body.by_status.Programada).toBe(1);
  });
});

describe('GET /api/promotions/summary integration', () => {
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
    await prisma.$executeRaw`DELETE FROM "promotion_products_categories"`;
    await prisma.$executeRaw`DELETE FROM "promotions"`;
    await prisma.$executeRaw`DELETE FROM "products_categories"`;
  });

  const uniqueName = (base: string) =>
    `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

  async function createPromotion(
    overrides: Partial<{
      status: 'Programada' | 'Activa' | 'Finalizada';
      start_date: string;
      end_date: string;
    }> = {}
  ) {
    const statusMap: Record<string, PromotionStatus> = {
      Programada: PromotionStatus.PROGRAMADA,
      Activa: PromotionStatus.ACTIVA,
      Finalizada: PromotionStatus.FINALIZADA,
    };

    const product = await prisma.productCategory.create({
      data: { name: uniqueName('Sum Product'), type: ProductCategoryType.PRODUCT },
    });

    const promotion = await prisma.promotion.create({
      data: {
        name: 'Test Promotion',
        discountType: 'PERCENTAGE',
        discountValue: 0.15,
        startDate: new Date(overrides.start_date || '2026-08-01T00:00:00.000Z'),
        endDate: new Date(overrides.end_date || '2026-08-30T23:59:59.000Z'),
        status: statusMap[overrides.status || 'Programada'],
        deletedAt: null,
      },
    });

    await prisma.promotionProductCategory.createMany({
      data: [
        {
          promotionId: promotion.id,
          productCategoryId: product.id,
          associationType: ProductCategoryType.PRODUCT,
        },
      ],
    });

    return promotion;
  }

  it('should return summary with mixed statuses', async () => {
    await createPromotion({ status: 'Programada' });
    await createPromotion({ status: 'Programada' });
    await createPromotion({ status: 'Programada' });
    await createPromotion({ status: 'Activa' });
    await createPromotion({ status: 'Activa' });
    await createPromotion({ status: 'Activa' });
    await createPromotion({ status: 'Activa' });
    await createPromotion({ status: 'Activa' });
    await createPromotion({ status: 'Finalizada' });
    await createPromotion({ status: 'Finalizada' });

    const response = await request(app).get('/api/promotions/summary').expect(200);

    expect(response.body.by_status).toEqual({
      Programada: 3,
      Activa: 5,
      Finalizada: 2,
    });
    // valid_today should be 5 since all Activa promotions have date range including today (Aug 2026)
    expect(response.body.valid_today).toBe(5);
  });

  it('should return zeros when no promotions exist', async () => {
    const response = await request(app).get('/api/promotions/summary').expect(200);

    expect(response.body.by_status).toEqual({
      Programada: 0,
      Activa: 0,
      Finalizada: 0,
    });
    expect(response.body.valid_today).toBe(0);
  });

  it('should return 0 valid_today when Activa promotions have future start_date', async () => {
    await createPromotion({
      status: 'Activa',
      start_date: '2026-10-01T00:00:00.000Z',
      end_date: '2026-10-30T23:59:59.000Z',
    });
    await createPromotion({
      status: 'Activa',
      start_date: '2026-10-01T00:00:00.000Z',
      end_date: '2026-10-30T23:59:59.000Z',
    });

    const response = await request(app).get('/api/promotions/summary').expect(200);

    expect(response.body.by_status.Activa).toBe(2);
    expect(response.body.valid_today).toBe(0);
  });

  it('should exclude soft-deleted promotions from summary', async () => {
    await createPromotion({ status: 'Activa' });
    const deletedPromo = await createPromotion({ status: 'Activa' });

    // Soft delete one
    await prisma.promotion.update({
      where: { id: deletedPromo.id },
      data: { deletedAt: new Date() },
    });

    const response = await request(app).get('/api/promotions/summary').expect(200);

    expect(response.body.by_status.Activa).toBe(1);
    expect(response.body.valid_today).toBe(1);
  });
});
