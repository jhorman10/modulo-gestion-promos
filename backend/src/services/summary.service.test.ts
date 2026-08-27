import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SummaryService } from './summary.service';
import { prisma } from '../prisma/client';
import { PromotionStatus } from '@prisma/client';

vi.mock('../prisma/client', () => ({
  prisma: {
    promotion: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('SummaryService', () => {
  let service: SummaryService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SummaryService();
    mockPrisma = prisma;
  });

  it('should return summary with counts by status and valid_today', async () => {
    // Arrange
    mockPrisma.promotion.groupBy.mockResolvedValue([
      { status: PromotionStatus.PROGRAMADA, _count: { status: 3 } },
      { status: PromotionStatus.ACTIVA, _count: { status: 5 } },
      { status: PromotionStatus.FINALIZADA, _count: { status: 2 } },
    ]);
    mockPrisma.promotion.count.mockResolvedValue(3);

    // Act
    const result = await service.getSummary();

    // Assert
    expect(result.by_status).toEqual({
      Programada: 3,
      Activa: 5,
      Finalizada: 2,
    });
    expect(result.valid_today).toBe(3);
  });

  it('should return zeros when no promotions exist', async () => {
    // Arrange
    mockPrisma.promotion.groupBy.mockResolvedValue([]);
    mockPrisma.promotion.count.mockResolvedValue(0);

    // Act
    const result = await service.getSummary();

    // Assert
    expect(result.by_status).toEqual({
      Programada: 0,
      Activa: 0,
      Finalizada: 0,
    });
    expect(result.valid_today).toBe(0);
  });

  it('should exclude soft-deleted promotions from summary', async () => {
    // This test verifies the service queries include the deletedAt filter
    mockPrisma.promotion.groupBy.mockResolvedValue([
      { status: PromotionStatus.PROGRAMADA, _count: { status: 1 } },
    ]);
    mockPrisma.promotion.count.mockResolvedValue(0);

    // Act
    const result = await service.getSummary();

    // Assert
    expect(result.by_status.Programada).toBe(1);
    expect(mockPrisma.promotion.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
      })
    );
  });
});