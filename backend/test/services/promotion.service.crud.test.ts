/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromotionService } from '../../src/services/promotion.service';
import { prisma } from '../../src/prisma/client';
import { PromotionStatus, DiscountType, ProductCategoryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('../../src/prisma/client', () => ({
  prisma: {
    promotion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    promotionProductCategory: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    productCategory: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('PromotionService - update', () => {
  let service: PromotionService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromotionService();
    mockPrisma = prisma;
  });

  const mockPromotion = {
    id: 'promo-1',
    name: 'Test Promotion',
    discountType: DiscountType.PERCENTAGE,
    discountValue: new Decimal('15'),
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-30T23:59:59.000Z'),
    status: PromotionStatus.PROGRAMADA,
    deletedAt: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  };

  const mockAssociations = [
    {
      promotionId: 'promo-1',
      productCategoryId: 'cat-1',
      associationType: ProductCategoryType.PRODUCT,
      productCategory: { id: 'cat-1', name: 'Product 1', type: ProductCategoryType.PRODUCT },
    },
    {
      promotionId: 'promo-1',
      productCategoryId: 'cat-2',
      associationType: ProductCategoryType.CATEGORY,
      productCategory: { id: 'cat-2', name: 'Category 1', type: ProductCategoryType.CATEGORY },
    },
  ];

  it('should update promotion name when status is Programada', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(mockPromotion);
    mockPrisma.productCategory.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          update: vi.fn().mockResolvedValue({ ...mockPromotion, name: 'Updated Name' }),
        },
        promotionProductCategory: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      return callback(tx);
    });
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);

    // Act
    const result = await service.update('promo-1', { name: 'Updated Name' });

    // Assert
    expect(result.name).toBe('Updated Name');
  });

  it('should update promotion discount_value when status is Activa', async () => {
    // Arrange
    const activePromotion = { ...mockPromotion, status: PromotionStatus.ACTIVA };
    mockPrisma.promotion.findUnique.mockResolvedValue(activePromotion);
    mockPrisma.productCategory.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          update: vi
            .fn()
            .mockResolvedValue({ ...activePromotion, discountValue: new Decimal('25') }),
        },
        promotionProductCategory: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      return callback(tx);
    });
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);

    // Act
    const result = await service.update('promo-1', { discount_value: 25 });

    // Assert
    expect(result.discount_value).toBe(25);
  });

  it('should throw error when updating Finalizada promotion', async () => {
    // Arrange
    const finalizedPromotion = { ...mockPromotion, status: PromotionStatus.FINALIZADA };
    mockPrisma.promotion.findUnique.mockResolvedValue(finalizedPromotion);

    // Act & Assert
    await expect(service.update('promo-1', { name: 'Updated Name' })).rejects.toThrow(
      'Finalizada promotions cannot be modified'
    );
  });

  it('should throw error when promotion not found', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(null);

    // Act & Assert
    await expect(service.update('non-existent', { name: 'Updated Name' })).rejects.toThrow(
      'Promotion not found'
    );
  });

  it('should update associations when provided', async () => {
    // Arrange
    const newProduct = { id: 'new-cat-1', name: 'New Product', type: ProductCategoryType.PRODUCT };
    mockPrisma.promotion.findUnique.mockResolvedValue(mockPromotion);
    mockPrisma.productCategory.findMany.mockResolvedValue([newProduct]);

    const updatedPromotion = { ...mockPromotion };
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        promotion: {
          update: vi.fn().mockResolvedValue(updatedPromotion),
        },
        promotionProductCategory: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    });
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([
      {
        promotionId: 'promo-1',
        productCategoryId: 'new-cat-1',
        associationType: ProductCategoryType.PRODUCT,
        productCategory: newProduct,
      },
    ]);

    // Act
    const result = await service.update('promo-1', {
      product_ids: ['new-cat-1'],
      category_ids: [],
    });

    // Assert
    expect(result.products).toHaveLength(1);
    expect(result.products[0].id).toBe('new-cat-1');
  });

  it('should throw error when product/category not found in update', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(mockPromotion);
    mockPrisma.productCategory.findMany.mockResolvedValue([]);

    // Act & Assert
    await expect(service.update('promo-1', { product_ids: ['non-existent'] })).rejects.toThrow(
      'Product or category not found'
    );
  });
});

describe('PromotionService - activate', () => {
  let service: PromotionService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromotionService();
    mockPrisma = prisma;
  });

  const mockPromotion = {
    id: 'promo-1',
    name: 'Test Promotion',
    discountType: DiscountType.PERCENTAGE,
    discountValue: new Decimal('15'),
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T23:59:59.000Z'),
    status: PromotionStatus.PROGRAMADA,
    deletedAt: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  };

  const mockAssociations = [
    {
      promotionId: 'promo-1',
      productCategoryId: 'cat-1',
      associationType: ProductCategoryType.PRODUCT,
      productCategory: { id: 'cat-1', name: 'Product 1', type: ProductCategoryType.PRODUCT },
    },
  ];

  it('should activate promotion when status is Programada and date is within range', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(mockPromotion);
    mockPrisma.promotion.update.mockResolvedValue({
      ...mockPromotion,
      status: PromotionStatus.ACTIVA,
    });
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);

    // Act
    const result = await service.activate('promo-1');

    // Assert
    expect(result.status).toBe('Activa');
    expect(mockPrisma.promotion.update).toHaveBeenCalledWith({
      where: { id: 'promo-1' },
      data: { status: PromotionStatus.ACTIVA },
    });
  });

  it('should throw error when promotion not found', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(null);

    // Act & Assert
    await expect(service.activate('non-existent')).rejects.toThrow('Promotion not found');
  });

  it('should throw error when promotion is not Programada', async () => {
    // Arrange
    const activePromotion = { ...mockPromotion, status: PromotionStatus.ACTIVA };
    mockPrisma.promotion.findUnique.mockResolvedValue(activePromotion);

    // Act & Assert
    await expect(service.activate('promo-1')).rejects.toThrow(
      'Only Programada promotions can be activated'
    );
  });

  it('should throw error when current date is before start_date', async () => {
    // Arrange
    const futurePromotion = {
      ...mockPromotion,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
    };
    mockPrisma.promotion.findUnique.mockResolvedValue(futurePromotion);

    // Act & Assert
    await expect(service.activate('promo-1')).rejects.toThrow(
      'Promotion cannot be activated outside its validity period'
    );
  });

  it('should throw error when current date is after end_date', async () => {
    // Arrange
    const pastPromotion = {
      ...mockPromotion,
      endDate: new Date('2026-07-30T23:59:59.000Z'),
    };
    mockPrisma.promotion.findUnique.mockResolvedValue(pastPromotion);

    // Act & Assert
    await expect(service.activate('promo-1')).rejects.toThrow(
      'Promotion cannot be activated outside its validity period'
    );
  });

  it('should throw error when promotion is Finalizada', async () => {
    // Arrange
    const finalizedPromotion = { ...mockPromotion, status: PromotionStatus.FINALIZADA };
    mockPrisma.promotion.findUnique.mockResolvedValue(finalizedPromotion);

    // Act & Assert
    await expect(service.activate('promo-1')).rejects.toThrow(
      'Only Programada promotions can be activated'
    );
  });
});

describe('PromotionService - finalize', () => {
  let service: PromotionService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromotionService();
    mockPrisma = prisma;
  });

  const mockPromotion = {
    id: 'promo-1',
    name: 'Test Promotion',
    discountType: DiscountType.PERCENTAGE,
    discountValue: new Decimal('15'),
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-30T23:59:59.000Z'),
    status: PromotionStatus.ACTIVA,
    deletedAt: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  };

  const mockAssociations = [
    {
      promotionId: 'promo-1',
      productCategoryId: 'cat-1',
      associationType: ProductCategoryType.PRODUCT,
      productCategory: { id: 'cat-1', name: 'Product 1', type: ProductCategoryType.PRODUCT },
    },
  ];

  it('should finalize promotion when status is Activa', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(mockPromotion);
    mockPrisma.promotion.update.mockResolvedValue({
      ...mockPromotion,
      status: PromotionStatus.FINALIZADA,
    });
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);

    // Act
    const result = await service.finalize('promo-1');

    // Assert
    expect(result.status).toBe('Finalizada');
    expect(mockPrisma.promotion.update).toHaveBeenCalledWith({
      where: { id: 'promo-1' },
      data: { status: PromotionStatus.FINALIZADA },
    });
  });

  it('should throw error when promotion not found', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(null);

    // Act & Assert
    await expect(service.finalize('non-existent')).rejects.toThrow('Promotion not found');
  });

  it('should throw error when promotion is not Activa (Programada)', async () => {
    // Arrange
    const scheduledPromotion = { ...mockPromotion, status: PromotionStatus.PROGRAMADA };
    mockPrisma.promotion.findUnique.mockResolvedValue(scheduledPromotion);

    // Act & Assert
    await expect(service.finalize('promo-1')).rejects.toThrow(
      'Only Activa promotions can be finalized'
    );
  });

  it('should throw error when promotion is already Finalizada', async () => {
    // Arrange
    const finalizedPromotion = { ...mockPromotion, status: PromotionStatus.FINALIZADA };
    mockPrisma.promotion.findUnique.mockResolvedValue(finalizedPromotion);

    // Act & Assert
    await expect(service.finalize('promo-1')).rejects.toThrow(
      'Only Activa promotions can be finalized'
    );
  });
});

describe('PromotionService - softDelete', () => {
  let service: PromotionService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromotionService();
    mockPrisma = prisma;
  });

  const mockPromotion = {
    id: 'promo-1',
    name: 'Test Promotion',
    discountType: DiscountType.PERCENTAGE,
    discountValue: new Decimal('15'),
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-30T23:59:59.000Z'),
    status: PromotionStatus.PROGRAMADA,
    deletedAt: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  };

  it('should soft delete promotion when status is Programada', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(mockPromotion);
    mockPrisma.promotion.update.mockResolvedValue({ ...mockPromotion, deletedAt: new Date() });

    // Act
    await service.softDelete('promo-1');

    // Assert
    expect(mockPrisma.promotion.update).toHaveBeenCalledWith({
      where: { id: 'promo-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('should throw error when promotion not found', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(null);

    // Act & Assert
    await expect(service.softDelete('non-existent')).rejects.toThrow('Promotion not found');
  });

  it('should throw error when promotion is Activa', async () => {
    // Arrange
    const activePromotion = { ...mockPromotion, status: PromotionStatus.ACTIVA };
    mockPrisma.promotion.findUnique.mockResolvedValue(activePromotion);

    // Act & Assert
    await expect(service.softDelete('promo-1')).rejects.toThrow(
      'Only Programada promotions can be deleted'
    );
  });

  it('should throw error when promotion is Finalizada', async () => {
    // Arrange
    const finalizedPromotion = { ...mockPromotion, status: PromotionStatus.FINALIZADA };
    mockPrisma.promotion.findUnique.mockResolvedValue(finalizedPromotion);

    // Act & Assert
    await expect(service.softDelete('promo-1')).rejects.toThrow(
      'Only Programada promotions can be deleted'
    );
  });
});
