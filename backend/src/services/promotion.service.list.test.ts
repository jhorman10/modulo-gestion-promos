import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromotionService } from './promotion.service';
import { prisma } from '../prisma/client';
import { PromotionStatus, DiscountType, ProductCategoryType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('../prisma/client', () => ({
  prisma: {
    promotion: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    promotionProductCategory: {
      findMany: vi.fn(),
    },
    productCategory: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('PromotionService - list', () => {
  let service: PromotionService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromotionService();
    mockPrisma = prisma;
  });

  const mockPromotions = [
    {
      id: 'promo-1',
      name: 'Promotion 1',
      discountType: DiscountType.PERCENTAGE,
      discountValue: new Decimal('0.15'),
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T23:59:59.000Z'),
      status: PromotionStatus.PROGRAMADA,
      deletedAt: null,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    },
    {
      id: 'promo-2',
      name: 'Promotion 2',
      discountType: DiscountType.FIXED,
      discountValue: new Decimal('500.00'),
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-10-31T23:59:59.000Z'),
      status: PromotionStatus.ACTIVA,
      deletedAt: null,
      createdAt: new Date('2026-08-02T10:00:00.000Z'),
      updatedAt: new Date('2026-08-02T10:00:00.000Z'),
    },
    {
      id: 'promo-3',
      name: 'Promotion 3',
      discountType: DiscountType.PERCENTAGE,
      discountValue: new Decimal('0.25'),
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T23:59:59.000Z'),
      status: PromotionStatus.FINALIZADA,
      deletedAt: null,
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
      updatedAt: new Date('2026-08-03T10:00:00.000Z'),
    },
  ];

  const mockAssociations = [
    { promotionId: 'promo-1', productCategoryId: 'cat-1', associationType: ProductCategoryType.PRODUCT, productCategory: { id: 'cat-1', name: 'Product 1', type: ProductCategoryType.PRODUCT } },
    { promotionId: 'promo-1', productCategoryId: 'cat-2', associationType: ProductCategoryType.CATEGORY, productCategory: { id: 'cat-2', name: 'Category 1', type: ProductCategoryType.CATEGORY } },
    { promotionId: 'promo-2', productCategoryId: 'cat-3', associationType: ProductCategoryType.PRODUCT, productCategory: { id: 'cat-3', name: 'Product 2', type: ProductCategoryType.PRODUCT } },
    { promotionId: 'promo-3', productCategoryId: 'cat-4', associationType: ProductCategoryType.CATEGORY, productCategory: { id: 'cat-4', name: 'Category 2', type: ProductCategoryType.CATEGORY } },
  ];

  it('should return paginated promotions with default page and size', async () => {
    // Arrange
    mockPrisma.promotion.findMany.mockResolvedValue(mockPromotions);
    mockPrisma.promotion.count.mockResolvedValue(3);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);

    // Act
    const result = await service.list({ page: 1, size: 10 });

    // Assert
    expect(result.data).toHaveLength(3);
    expect(result.pagination).toEqual({
      total: 3,
      page: 1,
      size: 10,
      total_pages: 1,
    });
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    );
  });

  it('should return paginated promotions with custom page and size', async () => {
    // Arrange
    mockPrisma.promotion.findMany.mockResolvedValue([mockPromotions[1]]);
    mockPrisma.promotion.count.mockResolvedValue(3);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([mockAssociations[2]]);

    // Act
    const result = await service.list({ page: 2, size: 1 });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.pagination).toEqual({
      total: 3,
      page: 2,
      size: 1,
      total_pages: 3,
    });
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        take: 1,
      })
    );
  });

  it('should filter by status', async () => {
    // Arrange
    mockPrisma.promotion.findMany.mockResolvedValue([mockPromotions[0]]);
    mockPrisma.promotion.count.mockResolvedValue(1);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([mockAssociations[0], mockAssociations[1]]);

    // Act
    const result = await service.list({ page: 1, size: 10, status: 'Programada' });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe('Programada');
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          status: PromotionStatus.PROGRAMADA,
        }),
      })
    );
  });

  it('should filter by product_id', async () => {
    // Arrange
    mockPrisma.promotion.findMany.mockResolvedValue([mockPromotions[0]]);
    mockPrisma.promotion.count.mockResolvedValue(1);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([mockAssociations[0]]);

    // Act
    const result = await service.list({ page: 1, size: 10, product_id: 'cat-1' });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          associations: {
            some: {
              productCategoryId: 'cat-1',
              associationType: ProductCategoryType.PRODUCT,
            },
          },
        }),
      })
    );
  });

  it('should filter by category_id', async () => {
    // Arrange
    mockPrisma.promotion.findMany.mockResolvedValue([mockPromotions[0]]);
    mockPrisma.promotion.count.mockResolvedValue(1);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([mockAssociations[1]]);

    // Act
    const result = await service.list({ page: 1, size: 10, category_id: 'cat-2' });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          associations: {
            some: {
              productCategoryId: 'cat-2',
              associationType: ProductCategoryType.CATEGORY,
            },
          },
        }),
      })
    );
  });

  it('should filter by start_date_from', async () => {
    // Arrange
    const fromDate = new Date('2026-10-01T00:00:00.000Z');
    mockPrisma.promotion.findMany.mockResolvedValue([mockPromotions[1], mockPromotions[2]]);
    mockPrisma.promotion.count.mockResolvedValue(2);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([mockAssociations[2], mockAssociations[3]]);

    // Act
    const result = await service.list({ page: 1, size: 10, start_date_from: fromDate });

    // Assert
    expect(result.data).toHaveLength(2);
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          startDate: { gte: fromDate },
        }),
      })
    );
  });

  it('should filter by end_date_to', async () => {
    // Arrange
    const toDate = new Date('2026-10-31T23:59:59.000Z');
    mockPrisma.promotion.findMany.mockResolvedValue([mockPromotions[0], mockPromotions[1]]);
    mockPrisma.promotion.count.mockResolvedValue(2);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([mockAssociations[0], mockAssociations[1], mockAssociations[2]]);

    // Act
    const result = await service.list({ page: 1, size: 10, end_date_to: toDate });

    // Assert
    expect(result.data).toHaveLength(2);
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          endDate: { lte: toDate },
        }),
      })
    );
  });

  it('should exclude soft-deleted promotions', async () => {
    // Arrange - the middleware handles this, but we verify the where clause includes deletedAt: null
    mockPrisma.promotion.findMany.mockResolvedValue([mockPromotions[0]]);
    mockPrisma.promotion.count.mockResolvedValue(1);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([mockAssociations[0], mockAssociations[1]]);

    // Act
    const result = await service.list({ page: 1, size: 10 });

    // Assert
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it('should return empty array when no promotions match', async () => {
    // Arrange
    mockPrisma.promotion.findMany.mockResolvedValue([]);
    mockPrisma.promotion.count.mockResolvedValue(0);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([]);

    // Act
    const result = await service.list({ page: 1, size: 10 });

    // Assert
    expect(result.data).toEqual([]);
    expect(result.pagination).toEqual({
      total: 0,
      page: 1,
      size: 10,
      total_pages: 0,
    });
  });

  it('should clamp size to maximum 100', async () => {
    // Arrange
    mockPrisma.promotion.findMany.mockResolvedValue(mockPromotions);
    mockPrisma.promotion.count.mockResolvedValue(3);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);

    // Act
    const result = await service.list({ page: 1, size: 200 });

    // Assert
    expect(result.pagination.size).toBe(100);
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('should clamp page to minimum 1', async () => {
    // Arrange
    mockPrisma.promotion.findMany.mockResolvedValue(mockPromotions);
    mockPrisma.promotion.count.mockResolvedValue(3);
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(mockAssociations);

    // Act
    const result = await service.list({ page: 0, size: 10 });

    // Assert
    expect(result.pagination.page).toBe(1);
    expect(mockPrisma.promotion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    );
  });
});