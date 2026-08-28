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
    },
    promotionProductCategory: {
      findMany: vi.fn(),
    },
  },
}));

describe('PromotionService - getById', () => {
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

  it('should return promotion with associations when found', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(mockPromotion);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);

    // Act
    const result = await service.getById('promo-1');

    // Assert
    expect(result).toEqual({
      id: 'promo-1',
      name: 'Test Promotion',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: '2026-09-01T00:00:00.000Z',
      end_date: '2026-09-30T23:59:59.000Z',
      status: 'Programada',
      products: [{ id: 'cat-1', name: 'Product 1', type: 'PRODUCT' }],
      categories: [{ id: 'cat-2', name: 'Category 1', type: 'CATEGORY' }],
      created_at: '2026-08-01T10:00:00.000Z',
      updated_at: '2026-08-01T10:00:00.000Z',
      deleted_at: null,
    });
    expect(mockPrisma.promotion.findUnique).toHaveBeenCalledWith({
      where: { id: 'promo-1' },
    });
  });

  it('should return null when promotion not found', async () => {
    // Arrange
    mockPrisma.promotion.findUnique.mockResolvedValue(null);

    // Act
    const result = await service.getById('non-existent');

    // Assert
    expect(result).toBeNull();
  });

  it('should return null when promotion is soft-deleted (middleware handles)', async () => {
    // The Prisma middleware automatically filters out soft-deleted records
    // This test verifies the service passes the correct where clause
    mockPrisma.promotion.findUnique.mockResolvedValue(null);

    const result = await service.getById('deleted-promo');

    expect(result).toBeNull();
    expect(mockPrisma.promotion.findUnique).toHaveBeenCalledWith({
      where: { id: 'deleted-promo' },
    });
  });

  it('should handle promotion with only products', async () => {
    // Arrange
    const promoWithProducts = { ...mockPromotion };
    const associationsWithProducts = [mockAssociations[0]];
    mockPrisma.promotion.findUnique.mockResolvedValue(promoWithProducts);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(associationsWithProducts);

    // Act
    const result = await service.getById('promo-1');

    // Assert
    expect(result.products).toHaveLength(1);
    expect(result.categories).toHaveLength(0);
  });

  it('should handle promotion with only categories', async () => {
    // Arrange
    const promoWithCategories = { ...mockPromotion };
    const associationsWithCategories = [mockAssociations[1]];
    mockPrisma.promotion.findUnique.mockResolvedValue(promoWithCategories);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(associationsWithCategories);

    // Act
    const result = await service.getById('promo-1');

    // Assert
    expect(result.products).toHaveLength(0);
    expect(result.categories).toHaveLength(1);
  });

  it('should handle fixed amount promotion', async () => {
    // Arrange
    const fixedPromotion = {
      ...mockPromotion,
      discountType: DiscountType.FIXED,
      discountValue: new Decimal('500.00'),
    };
    mockPrisma.promotion.findUnique.mockResolvedValue(fixedPromotion);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);

    // Act
    const result = await service.getById('promo-1');

    // Assert
    expect(result.discount_type).toBe('fixed');
    expect(result.discount_value).toBe(500);
  });
});
