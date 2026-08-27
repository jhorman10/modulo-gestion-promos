import { PrismaClient, PromotionStatus } from '@prisma/client';
import { prisma } from '../prisma/client';

export interface PromotionSummary {
  by_status: {
    Programada: number;
    Activa: number;
    Finalizada: number;
  };
  valid_today: number;
}

/**
 * Service for generating promotion summary statistics.
 * Separated from PromotionService to follow single responsibility principle.
 */
export class SummaryService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  /**
   * Get promotion summary with counts by status and valid today count.
   * Excludes soft-deleted promotions.
   */
  async getSummary(): Promise<PromotionSummary> {
    // Get counts by status
    const statusCounts = await this.prisma.promotion.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { status: true },
    });

    // Initialize counts
    const byStatus = {
      Programada: 0,
      Activa: 0,
      Finalizada: 0,
    };

    // Map Prisma enum to API format
    statusCounts.forEach(item => {
      const status = item.status === PromotionStatus.PROGRAMADA ? 'Programada'
        : item.status === PromotionStatus.ACTIVA ? 'Activa'
        : 'Finalizada';
      byStatus[status] = item._count.status;
    });

    // Get valid today count (Activa promotions where current date is within [startDate, endDate])
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const validToday = await this.prisma.promotion.count({
      where: {
        deletedAt: null,
        status: PromotionStatus.ACTIVA,
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    return {
      by_status: byStatus,
      valid_today: validToday,
    };
  }
}