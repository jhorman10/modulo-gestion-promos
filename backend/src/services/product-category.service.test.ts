import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ProductCategoryService } from './product-category.service';
import { prisma } from '../prisma/client';
import { ProductCategoryType } from '@prisma/client';

describe('ProductCategoryService integration', () => {
  let service: ProductCategoryService;
  let testRunId: number;

  beforeAll(async () => {
    service = new ProductCategoryService();
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

  const uniqueName = (base: string) => `${base}_${testRunId}_${Math.random().toString(36).slice(2, 8)}`;

  describe('listAll', () => {
    it('should return empty arrays when no products or categories exist', async () => {
      const result = await service.listAll();
      
      expect(result).toEqual({
        products: [],
        categories: [],
        pagination: {
          total: 0,
          page: 1,
          size: 50,
          total_pages: 0,
        },
      });
    });

    it('should return products and categories separated by type', async () => {
      const product1 = uniqueName('Product 1');
      const product2 = uniqueName('Product 2');
      const category1 = uniqueName('Category 1');
      const category2 = uniqueName('Category 2');
      const category3 = uniqueName('Category 3');
      
      // Create test products
      await prisma.productCategory.createMany({
        data: [
          { name: product1, type: ProductCategoryType.PRODUCT },
          { name: product2, type: ProductCategoryType.PRODUCT },
        ],
      });

      // Create test categories
      await prisma.productCategory.createMany({
        data: [
          { name: category1, type: ProductCategoryType.CATEGORY },
          { name: category2, type: ProductCategoryType.CATEGORY },
          { name: category3, type: ProductCategoryType.CATEGORY },
        ],
      });

      const result = await service.listAll();
      
      expect(result.products).toHaveLength(2);
      expect(result.categories).toHaveLength(3);
      expect(result.products.every(p => p.type === 'PRODUCT')).toBe(true);
      expect(result.categories.every(c => c.type === 'CATEGORY')).toBe(true);
      expect(result.pagination.total).toBe(5);
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

      const result = await service.listAll();
      
      expect(result.products.map(p => p.name)).toEqual([appleProduct, zebraProduct]);
      expect(result.categories.map(c => c.name)).toEqual([appleCategory, bananaCategory]);
    });

    it('should support pagination', async () => {
      // Create 15 products
      const products = Array.from({ length: 15 }, (_, i) => ({
        name: uniqueName(`Product ${i + 1}`),
        type: ProductCategoryType.PRODUCT,
      }));
      await prisma.productCategory.createMany({ data: products });

      // Page 1, size 10
      const page1 = await service.listAll({ page: 1, size: 10 });
      expect(page1.products).toHaveLength(10);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.size).toBe(10);
      expect(page1.pagination.total_pages).toBe(2);

      // Page 2, size 10
      const page2 = await service.listAll({ page: 2, size: 10 });
      expect(page2.products).toHaveLength(5);
      expect(page2.pagination.page).toBe(2);
      expect(page2.pagination.total).toBe(15);
    });

    it('should clamp size to maximum 100', async () => {
      const products = Array.from({ length: 150 }, (_, i) => ({
        name: uniqueName(`Product ${i + 1}`),
        type: ProductCategoryType.PRODUCT,
      }));
      await prisma.productCategory.createMany({ data: products });

      const result = await service.listAll({ page: 1, size: 200 });
      expect(result.products).toHaveLength(100);
      expect(result.pagination.size).toBe(100);
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

      const result = await service.listAll({ type: 'PRODUCT' });
      
      expect(result.products).toHaveLength(2);
      expect(result.categories).toHaveLength(0);
      expect(result.pagination.total).toBe(2);
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

      const result = await service.listAll({ type: 'CATEGORY' });
      
      expect(result.products).toHaveLength(0);
      expect(result.categories).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should return each item with id, name, and type', async () => {
      const testProduct = uniqueName('Test Product');
      
      await prisma.productCategory.create({
        data: { name: testProduct, type: ProductCategoryType.PRODUCT },
      });

      const result = await service.listAll();
      
      expect(result.products[0]).toHaveProperty('id');
      expect(result.products[0]).toHaveProperty('name', testProduct);
      expect(result.products[0]).toHaveProperty('type', 'PRODUCT');
      expect(typeof result.products[0].id).toBe('string');
    });
  });
});