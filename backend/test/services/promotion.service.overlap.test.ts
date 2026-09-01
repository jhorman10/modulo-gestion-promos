/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromotionService } from '../../src/services/promotion.service';
import { prisma } from '../../src/prisma/client';
import { PromotionStatus, DiscountType, ProductCategoryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCode } from '../../src/utils/errors';

vi.mock('../../src/prisma/client', () => ({
  prisma: {
    promotion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
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

const PRODUCT_A = '11111111-1111-1111-1111-111111111111';
const PRODUCT_B = '22222222-2222-2222-2222-222222222222';
const CATEGORY_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CATEGORY_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('PromotionService - overlap prevention (create)', () => {
  let service: PromotionService;
  let mockPrisma: any;

  const mockCreatedPromotion = {
    id: 'new-promo',
    name: 'New Promotion',
    discountType: DiscountType.PERCENTAGE,
    discountValue: new Decimal('10'),
    startDate: new Date('2026-09-10T00:00:00.000Z'),
    endDate: new Date('2026-09-20T23:59:59.000Z'),
    status: PromotionStatus.PROGRAMADA,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromotionService();
    mockPrisma = prisma;
    // Default: no overlap
    mockPrisma.promotion.findFirst.mockResolvedValue(null);
    mockPrisma.productCategory.findMany.mockImplementation(async ({ where }: any) => {
      const ids: string[] = where?.id?.in ?? [];
      return ids.map((id: string) => ({ id, name: `Item ${id}`, type: 'PRODUCT' }));
    });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        promotion: { create: vi.fn().mockResolvedValue(mockCreatedPromotion) },
        promotionProductCategory: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return cb(tx);
    });
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue([]);
  });

  it('rejects full overlap (same range) on shared product', async () => {
    mockPrisma.promotion.findFirst.mockResolvedValue({
      id: 'existing',
      name: 'Existing Promo',
      startDate: new Date('2026-09-10T00:00:00.000Z'),
      endDate: new Date('2026-09-20T23:59:59.000Z'),
    });

    await expect(
      service.create({
        name: 'New',
        discount_type: 'percentage',
        discount_value: 10,
        start_date: new Date('2026-09-10T00:00:00.000Z'),
        end_date: new Date('2026-09-20T23:59:59.000Z'),
        product_ids: [PRODUCT_A],
        category_ids: [],
      })
    ).rejects.toMatchObject({
      code: ErrorCode.PROMOTION_OVERLAP,
      statusCode: 409,
      message: expect.stringContaining('Existing Promo'),
    });
  });

  it('rejects partial overlap where new starts inside existing', async () => {
    mockPrisma.promotion.findFirst.mockResolvedValue({
      id: 'existing',
      name: 'Existing',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T23:59:59.000Z'),
    });

    await expect(
      service.create({
        name: 'New',
        discount_type: 'percentage',
        discount_value: 10,
        start_date: new Date('2026-09-15T00:00:00.000Z'),
        end_date: new Date('2026-09-25T23:59:59.000Z'),
        product_ids: [PRODUCT_A],
        category_ids: [],
      })
    ).rejects.toMatchObject({ code: ErrorCode.PROMOTION_OVERLAP, statusCode: 409 });
  });

  it('rejects partial overlap where new ends inside existing', async () => {
    mockPrisma.promotion.findFirst.mockResolvedValue({
      id: 'existing',
      name: 'Existing',
      startDate: new Date('2026-09-15T00:00:00.000Z'),
      endDate: new Date('2026-09-30T23:59:59.000Z'),
    });

    await expect(
      service.create({
        name: 'New',
        discount_type: 'percentage',
        discount_value: 10,
        start_date: new Date('2026-09-01T00:00:00.000Z'),
        end_date: new Date('2026-09-25T23:59:59.000Z'),
        product_ids: [PRODUCT_A],
        category_ids: [],
      })
    ).rejects.toMatchObject({ code: ErrorCode.PROMOTION_OVERLAP, statusCode: 409 });
  });

  it('rejects nested overlap (new range contains existing)', async () => {
    mockPrisma.promotion.findFirst.mockResolvedValue({
      id: 'existing',
      name: 'Existing',
      startDate: new Date('2026-09-10T00:00:00.000Z'),
      endDate: new Date('2026-09-15T00:00:00.000Z'),
    });

    await expect(
      service.create({
        name: 'New',
        discount_type: 'percentage',
        discount_value: 10,
        start_date: new Date('2026-09-01T00:00:00.000Z'),
        end_date: new Date('2026-09-30T23:59:59.000Z'),
        product_ids: [PRODUCT_A],
        category_ids: [],
      })
    ).rejects.toMatchObject({ code: ErrorCode.PROMOTION_OVERLAP, statusCode: 409 });
  });

  it('allows adjacent ranges (end == start) without overlap', async () => {
    // findFirst mock returns null (no overlap found), so create should succeed
    const result = await service.create({
      name: 'Adjacent',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date('2026-09-20T00:00:00.000Z'),
      end_date: new Date('2026-09-30T00:00:00.000Z'),
      product_ids: [PRODUCT_A],
      category_ids: [],
    });
    expect(result.name).toBe('New Promotion');
  });

  it('allows overlap when products and categories are different', async () => {
    // findFirst returns null because no association matches PRODUCT_B
    const result = await service.create({
      name: 'Different product',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date('2026-09-10T00:00:00.000Z'),
      end_date: new Date('2026-09-20T23:59:59.000Z'),
      product_ids: [PRODUCT_B],
      category_ids: [CATEGORY_B],
    });
    expect(result).toBeDefined();
  });

  it('detects overlap via shared category even with different products', async () => {
    mockPrisma.promotion.findFirst.mockResolvedValue({
      id: 'existing',
      name: 'Existing via category',
      startDate: new Date('2026-09-10T00:00:00.000Z'),
      endDate: new Date('2026-09-20T23:59:59.000Z'),
    });

    await expect(
      service.create({
        name: 'New',
        discount_type: 'percentage',
        discount_value: 10,
        start_date: new Date('2026-09-10T00:00:00.000Z'),
        end_date: new Date('2026-09-20T23:59:59.000Z'),
        product_ids: [PRODUCT_B],
        category_ids: [CATEGORY_A],
      })
    ).rejects.toMatchObject({ code: ErrorCode.PROMOTION_OVERLAP, statusCode: 409 });
  });

  it('calls findFirst with strict overlap conditions (start lt end_b AND end gt start_b)', async () => {
    await service.create({
      name: 'Probe',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: new Date('2026-09-10T00:00:00.000Z'),
      end_date: new Date('2026-09-20T23:59:59.000Z'),
      product_ids: [PRODUCT_A],
      category_ids: [CATEGORY_A],
    });

    expect(mockPrisma.promotion.findFirst).toHaveBeenCalledTimes(1);
    const call = mockPrisma.promotion.findFirst.mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.status).toEqual({
      in: [PromotionStatus.PROGRAMADA, PromotionStatus.ACTIVA],
    });
    expect(call.where.startDate).toEqual({ lt: new Date('2026-09-20T23:59:59.000Z') });
    expect(call.where.endDate).toEqual({ gt: new Date('2026-09-10T00:00:00.000Z') });
    expect(call.where.associations.some.productCategoryId).toEqual({
      in: expect.arrayContaining([PRODUCT_A, CATEGORY_A]),
    });
    expect(call.where.id).toBeUndefined(); // create() does not exclude self
  });
});

describe('PromotionService - overlap prevention (update)', () => {
  let service: PromotionService;
  let mockPrisma: any;

  const baseExisting = {
    id: 'promo-1',
    name: 'My Promo',
    discountType: DiscountType.PERCENTAGE,
    discountValue: new Decimal('10'),
    startDate: new Date('2026-09-10T00:00:00.000Z'),
    endDate: new Date('2026-09-20T23:59:59.000Z'),
    status: PromotionStatus.PROGRAMADA,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const currentAssociations = [
    {
      promotionId: 'promo-1',
      productCategoryId: PRODUCT_A,
      associationType: ProductCategoryType.PRODUCT,
      productCategory: { id: PRODUCT_A, name: 'Product A', type: ProductCategoryType.PRODUCT },
    },
    {
      promotionId: 'promo-1',
      productCategoryId: CATEGORY_A,
      associationType: ProductCategoryType.CATEGORY,
      productCategory: { id: CATEGORY_A, name: 'Category A', type: ProductCategoryType.CATEGORY },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromotionService();
    mockPrisma = prisma;
    mockPrisma.promotion.findFirst.mockResolvedValue(null);
    // Default: current associations include PRODUCT_A + CATEGORY_A
    mockPrisma.promotionProductCategory.findMany.mockResolvedValue(currentAssociations);
    mockPrisma.productCategory.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        promotion: { update: vi.fn().mockResolvedValue(baseExisting) },
        promotionProductCategory: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      return cb(tx);
    });
  });

  it('does not conflict with itself when updating the dates while keeping associations', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue(baseExisting);

    const result = await service.update('promo-1', {
      start_date: new Date('2026-09-12T00:00:00.000Z'),
      end_date: new Date('2026-09-18T23:59:59.000Z'),
    });
    expect(result).toBeDefined();
    // findFirst must be called with id: { not: 'promo-1' } to exclude self
    expect(mockPrisma.promotion.findFirst).toHaveBeenCalledTimes(1);
    const call = mockPrisma.promotion.findFirst.mock.calls[0][0];
    expect(call.where.id).toEqual({ not: 'promo-1' });
  });

  it('rejects update that changes dates creating overlap with another promotion', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue(baseExisting);
    mockPrisma.promotion.findFirst.mockResolvedValue({
      id: 'other',
      name: 'Other',
      startDate: new Date('2026-10-15T00:00:00.000Z'),
      endDate: new Date('2026-10-25T23:59:59.000Z'),
    });

    await expect(
      service.update('promo-1', {
        start_date: new Date('2026-10-15T00:00:00.000Z'),
        end_date: new Date('2026-10-25T23:59:59.000Z'),
      })
    ).rejects.toMatchObject({ code: ErrorCode.PROMOTION_OVERLAP, statusCode: 409 });
  });

  it('rejects update that changes products creating overlap with another promotion', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue(baseExisting);
    mockPrisma.promotion.findFirst.mockResolvedValue({
      id: 'other',
      name: 'Other',
      startDate: new Date('2026-09-10T00:00:00.000Z'),
      endDate: new Date('2026-09-20T23:59:59.000Z'),
    });
    mockPrisma.productCategory.findMany.mockResolvedValue([
      { id: PRODUCT_B, name: 'Other product', type: 'PRODUCT' },
    ]);

    await expect(
      service.update('promo-1', { product_ids: [PRODUCT_B], category_ids: [] })
    ).rejects.toMatchObject({ code: ErrorCode.PROMOTION_OVERLAP, statusCode: 409 });
  });

  it('skips overlap check when update only touches name/discount (no range or assoc change)', async () => {
    mockPrisma.promotion.findUnique.mockResolvedValue(baseExisting);

    await service.update('promo-1', { name: 'Just a rename', discount_value: 25 });
    expect(mockPrisma.promotion.findFirst).not.toHaveBeenCalled();
  });
});
