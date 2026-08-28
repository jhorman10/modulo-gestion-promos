/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromotionService } from '../../src/services/promotion.service';
import { prisma } from '../../src/prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma
vi.mock('../../src/prisma/client', () => ({
  prisma: {
    promotion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    promotionProductCategory: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    productCategory: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('PromotionService - create', () => {
  let service: PromotionService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromotionService();
    mockPrisma = prisma;
  });

  const validCreateInput = {
    name: 'Test Promotion',
    discount_type: 'percentage' as const,
    discount_value: 15,
    start_date: new Date('2026-09-01T00:00:00.000Z'),
    end_date: new Date('2026-09-30T23:59:59.000Z'),
    product_ids: ['123e4567-e89b-12d3-a456-426614174000'],
    category_ids: ['123e4567-e89b-12d3-a456-426614174001'],
  };

  const mockPromotion = {
    id: 'promo-123',
    name: 'Test Promotion',
    discountType: 'PERCENTAGE',
    discountValue: new Decimal('15'),
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-30T23:59:59.000Z'),
    status: 'PROGRAMADA',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAssociations = [
    {
      productCategoryId: '123e4567-e89b-12d3-a456-426614174000',
      associationType: 'PRODUCT',
      productCategory: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Product 1',
        type: 'PRODUCT',
      },
    },
    {
      productCategoryId: '123e4567-e89b-12d3-a456-426614174001',
      associationType: 'CATEGORY',
      productCategory: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Category 1',
        type: 'CATEGORY',
      },
    },
  ];

  it('should create percentage promotion with product and category associations', async () => {
    // Arrange
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          create: vi.fn().mockResolvedValue(mockPromotion),
        },
        promotionProductCategory: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };
      return callback(tx);
    });

    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);
    mockPrisma.productCategory.findMany.mockResolvedValue([
      { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Product 1', type: 'PRODUCT' },
      { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Category 1', type: 'CATEGORY' },
    ]);

    // Act
    const result = await service.create(validCreateInput);

    // Assert
    expect(result).toEqual({
      id: 'promo-123',
      name: 'Test Promotion',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: '2026-09-01T00:00:00.000Z',
      end_date: '2026-09-30T23:59:59.000Z',
      status: 'Programada',
      products: [
        { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Product 1', type: 'PRODUCT' },
      ],
      categories: [
        { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Category 1', type: 'CATEGORY' },
      ],
      created_at: expect.any(String),
      updated_at: expect.any(String),
      deleted_at: null,
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('should create fixed amount promotion with only product associations', async () => {
    // Arrange
    const fixedInput = {
      ...validCreateInput,
      discount_type: 'fixed' as const,
      discount_value: 500,
      category_ids: [],
    };
    const mockFixedPromotion = {
      ...mockPromotion,
      discountType: 'FIXED',
      discountValue: new Decimal('500.00'),
    };
    const fixedAssociations = [
      {
        productCategoryId: '123e4567-e89b-12d3-a456-426614174000',
        associationType: 'PRODUCT',
        productCategory: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Product 1',
          type: 'PRODUCT',
        },
      },
    ];

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          create: vi.fn().mockResolvedValue(mockFixedPromotion),
        },
        promotionProductCategory: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    });

    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(fixedAssociations);
    mockPrisma.productCategory.findMany.mockResolvedValue([
      { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Product 1', type: 'PRODUCT' },
    ]);

    // Act
    const result = await service.create(fixedInput);

    // Assert
    expect(result.discount_type).toBe('fixed');
    expect(result.discount_value).toBe(500);
    expect(result.products).toHaveLength(1);
    expect(result.categories).toHaveLength(0);
  });

  it('should create promotion with only category associations', async () => {
    // Arrange
    const categoryOnlyInput = { ...validCreateInput, product_ids: [] };
    const mockCategoryPromotion = { ...mockPromotion };
    const categoryAssociations = [
      {
        productCategoryId: '123e4567-e89b-12d3-a456-426614174001',
        associationType: 'CATEGORY',
        productCategory: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Category 1',
          type: 'CATEGORY',
        },
      },
    ];

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          create: vi.fn().mockResolvedValue(mockCategoryPromotion),
        },
        promotionProductCategory: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    });

    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(categoryAssociations);
    mockPrisma.productCategory.findMany.mockResolvedValue([
      { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Category 1', type: 'CATEGORY' },
    ]);

    // Act
    const result = await service.create(categoryOnlyInput);

    // Assert
    expect(result.products).toHaveLength(0);
    expect(result.categories).toHaveLength(1);
  });

  it('should store percentage discount_value as decimal', async () => {
    // Arrange
    const decimalAssociations = [
      {
        productCategoryId: '123e4567-e89b-12d3-a456-426614174000',
        associationType: 'PRODUCT',
        productCategory: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Product 1',
          type: 'PRODUCT',
        },
      },
      {
        productCategoryId: '123e4567-e89b-12d3-a456-426614174001',
        associationType: 'CATEGORY',
        productCategory: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Category 1',
          type: 'CATEGORY',
        },
      },
    ];

    mockPrisma.productCategory.findMany.mockResolvedValue([
      { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Product 1', type: 'PRODUCT' },
      { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Category 1', type: 'CATEGORY' },
    ]);

    const mockTx = {
      promotion: {
        create: vi.fn().mockResolvedValue(mockPromotion),
      },
      promotionProductCategory: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });

    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(decimalAssociations);

    // Act
    const result = await service.create(validCreateInput);

    // Assert
    expect(result.discount_value).toBe(15);
    // Verify Prisma was called with correct discount type and value
    const callArgs = mockTx.promotion.create.mock.calls[0][0];
    expect(callArgs.data.discountType).toBe('PERCENTAGE');
    // Decimal object - check it represents 15
    expect(Number(callArgs.data.discountValue)).toBe(15);
  });

  it('should set initial status to Programada', async () => {
    // Arrange
    const emptyAssociations: any[] = [];

    mockPrisma.productCategory.findMany.mockResolvedValue([
      { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Product 1', type: 'PRODUCT' },
      { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Category 1', type: 'CATEGORY' },
    ]);

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          create: vi.fn().mockResolvedValue(mockPromotion),
        },
        promotionProductCategory: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    });

    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(emptyAssociations);

    // Act
    const result = await service.create(validCreateInput);

    // Assert
    expect(result.status).toBe('Programada');
  });

  it('should set deleted_at to null', async () => {
    // Arrange
    const emptyAssociations: any[] = [];

    mockPrisma.productCategory.findMany.mockResolvedValue([
      { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Product 1', type: 'PRODUCT' },
      { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Category 1', type: 'CATEGORY' },
    ]);

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          create: vi.fn().mockResolvedValue(mockPromotion),
        },
        promotionProductCategory: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    });

    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(emptyAssociations);

    // Act
    const result = await service.create(validCreateInput);

    // Assert
    expect(result.deleted_at).toBeNull();
  });

  it('should create junction records for products with association_type PRODUCT', async () => {
    // Arrange
    const junctionAssociations = [
      {
        productCategoryId: '123e4567-e89b-12d3-a456-426614174000',
        associationType: 'PRODUCT',
        productCategory: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Product 1',
          type: 'PRODUCT',
        },
      },
      {
        productCategoryId: '123e4567-e89b-12d3-a456-426614174001',
        associationType: 'CATEGORY',
        productCategory: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Category 1',
          type: 'CATEGORY',
        },
      },
    ];

    mockPrisma.productCategory.findMany.mockResolvedValue([
      { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Product 1', type: 'PRODUCT' },
      { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Category 1', type: 'CATEGORY' },
    ]);

    let capturedTx: any;
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          create: vi.fn().mockResolvedValue(mockPromotion),
        },
        promotionProductCategory: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      capturedTx = tx;
      return callback(tx);
    });

    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(junctionAssociations);

    // Act
    await service.create(validCreateInput);

    // Assert - check that createMany was called twice (once for products, once for categories)
    expect(capturedTx).toBeDefined();
    expect(capturedTx.promotionProductCategory.createMany).toHaveBeenCalledTimes(2);

    // First call should be for products
    const firstCall = capturedTx.promotionProductCategory.createMany.mock.calls[0];
    expect(firstCall[0]).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            associationType: 'PRODUCT',
            productCategoryId: '123e4567-e89b-12d3-a456-426614174000',
          }),
        ]),
      })
    );

    // Second call should be for categories
    const secondCall = capturedTx.promotionProductCategory.createMany.mock.calls[1];
    expect(secondCall[0]).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            associationType: 'CATEGORY',
            productCategoryId: '123e4567-e89b-12d3-a456-426614174001',
          }),
        ]),
      })
    );
  });

  it('should throw error if product/category IDs do not exist', async () => {
    // Arrange
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          create: vi.fn().mockResolvedValue(mockPromotion),
        },
        promotionProductCategory: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    });

    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([
      { productCategoryId: '123e4567-e89b-12d3-a456-426614174000', associationType: 'PRODUCT' },
    ]);
    // ProductCategory.findMany returns empty - IDs don't exist
    mockPrisma.productCategory.findMany.mockResolvedValue([]);

    // Act & Assert
    await expect(service.create(validCreateInput)).rejects.toThrow('Product or category not found');
  });
});
