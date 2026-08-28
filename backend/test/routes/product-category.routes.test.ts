/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/main';
import { prisma } from '../../src/prisma/client';
import { ProductCategoryType } from '@prisma/client';

describe('GET /api/products-categories integration', () => {
  let app: ReturnType<typeof createApp>;
  let server: any;
  let testRunId: number;

  beforeAll(async () => {
    app = createApp();
    server = app.listen(0);
    testRunId = Date.now();
  });

  afterAll(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.promotionProductCategory.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.productCategory.deleteMany();
  });

  const uniqueName = (base: string) => `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

  it('should return 200 with products and categories separated by type', async () => {
    const product1 = uniqueName('Product 1');
    const product2 = uniqueName('Product 2');
    const category1 = uniqueName('Category 1');
    const category2 = uniqueName('Category 2');
    const category3 = uniqueName('Category 3');
    
    await prisma.productCategory.createMany({
      data: [
        { name: product1, type: ProductCategoryType.PRODUCT },
        { name: product2, type: ProductCategoryType.PRODUCT },
        { name: category1, type: ProductCategoryType.CATEGORY },
        { name: category2, type: ProductCategoryType.CATEGORY },
        { name: category3, type: ProductCategoryType.CATEGORY },
      ],
    });

    const response = await request(server)
      .get('/api/products-categories')
      .expect(200);

    expect(response.body).toEqual({
      products: expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), type: 'PRODUCT' }),
        expect.objectContaining({ id: expect.any(String), type: 'PRODUCT' }),
      ]),
      categories: expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), type: 'CATEGORY' }),
        expect.objectContaining({ id: expect.any(String), type: 'CATEGORY' }),
        expect.objectContaining({ id: expect.any(String), type: 'CATEGORY' }),
      ]),
      pagination: {
        total: 5,
        page: 1,
        size: 10,
        total_pages: 1,
      },
    });
  });

  it('should return 200 with empty arrays when no data exists', async () => {
    const response = await request(server)
      .get('/api/products-categories')
      .expect(200);

    expect(response.body).toEqual({
      products: [],
      categories: [],
      pagination: {
        total: 0,
        page: 1,
        size: 10,
        total_pages: 0,
      },
    });
  });

  it('should support pagination with page and size parameters', async () => {
    const products = Array.from({ length: 15 }, (_, i) => ({
      name: uniqueName(`Product ${i + 1}`),
      type: ProductCategoryType.PRODUCT,
    }));
    await prisma.productCategory.createMany({ data: products });

    const response = await request(server)
      .get('/api/products-categories?page=2&size=10')
      .expect(200);

    expect(response.body.products).toHaveLength(5);
    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.size).toBe(10);
    expect(response.body.pagination.total).toBe(15);
    expect(response.body.pagination.total_pages).toBe(2);
  });

  it('should return 400 when size exceeds maximum 100', async () => {
    const products = Array.from({ length: 150 }, (_, i) => ({
      name: uniqueName(`Product ${i + 1}`),
      type: ProductCategoryType.PRODUCT,
    }));
    await prisma.productCategory.createMany({ data: products });

    const response = await request(server)
      .get('/api/products-categories?size=200')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should support type filter for products only', async () => {
    const product1 = uniqueName('Product 1');
    const product2 = uniqueName('Product 2');
    const category1 = uniqueName('Category 1');
    
    await prisma.productCategory.createMany({
      data: [
        { name: product1, type: ProductCategoryType.PRODUCT },
        { name: product2, type: ProductCategoryType.PRODUCT },
        { name: category1, type: ProductCategoryType.CATEGORY },
      ],
    });

    const response = await request(server)
      .get('/api/products-categories?type=PRODUCT')
      .expect(200);

    expect(response.body.products).toHaveLength(2);
    expect(response.body.categories).toHaveLength(0);
    expect(response.body.pagination.total).toBe(2);
  });

  it('should support type filter for categories only', async () => {
    const product1 = uniqueName('Product 1');
    const category1 = uniqueName('Category 1');
    const category2 = uniqueName('Category 2');
    
    await prisma.productCategory.createMany({
      data: [
        { name: product1, type: ProductCategoryType.PRODUCT },
        { name: category1, type: ProductCategoryType.CATEGORY },
        { name: category2, type: ProductCategoryType.CATEGORY },
      ],
    });

    const response = await request(server)
      .get('/api/products-categories?type=CATEGORY')
      .expect(200);

    expect(response.body.products).toHaveLength(0);
    expect(response.body.categories).toHaveLength(2);
    expect(response.body.pagination.total).toBe(2);
  });

  it('should return 400 for invalid page parameter', async () => {
    await request(server)
      .get('/api/products-categories?page=0')
      .expect(400);

    await request(server)
      .get('/api/products-categories?page=-1')
      .expect(400);
  });

  it('should return 400 for invalid size parameter', async () => {
    await request(server)
      .get('/api/products-categories?size=0')
      .expect(400);

    await request(server)
      .get('/api/products-categories?size=101')
      .expect(400);
  });

  it('should return 400 for invalid type parameter', async () => {
    await request(server)
      .get('/api/products-categories?type=INVALID')
      .expect(400);
  });

  it('should order results by name ascending', async () => {
    const zebraProduct = uniqueName('Zebra Product');
    const appleProduct = uniqueName('Apple Product');
    const bananaCategory = uniqueName('Banana Category');
    const appleCategory = uniqueName('Apple Category');
    
    await prisma.productCategory.createMany({
      data: [
        { name: zebraProduct, type: ProductCategoryType.PRODUCT },
        { name: appleProduct, type: ProductCategoryType.PRODUCT },
        { name: bananaCategory, type: ProductCategoryType.CATEGORY },
        { name: appleCategory, type: ProductCategoryType.CATEGORY },
      ],
    });

    const response = await request(server)
      .get('/api/products-categories')
      .expect(200);

    expect(response.body.products.map((p: any) => p.name)).toEqual([appleProduct, zebraProduct]);
    expect(response.body.categories.map((c: any) => c.name)).toEqual([appleCategory, bananaCategory]);
  });
});