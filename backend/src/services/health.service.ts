import { PrismaClient } from '@prisma/client';
import { prisma } from '../prisma/client';

export class HealthService {
  private prisma: PrismaClient;
  private readonly DB_QUERY_TIMEOUT = 2000; // 2 seconds

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  async getHealth(): Promise<{
    status: 'ok' | 'error';
    database: 'connected' | 'disconnected';
    timestamp: string;
  }> {
    try {
      // Execute lightweight query to verify DB connectivity with 2s timeout
      await this.executeWithTimeout(this.prisma.$queryRaw`SELECT 1`);
      
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }

  private executeWithTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), this.DB_QUERY_TIMEOUT)
      ),
    ]);
  }
}