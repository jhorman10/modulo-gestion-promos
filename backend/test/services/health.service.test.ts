/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../../src/services/health.service';

// Mock Prisma Client using vi.hoisted to avoid hoisting issues
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('../../src/prisma/client', () => ({
  prisma: mockPrisma,
}));

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    vi.clearAllMocks();
    healthService = new HealthService(mockPrisma as any);
  });

  describe('getHealth', () => {
    it('should return ok status with connected database and timestamp when DB query succeeds', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Act
      const result = await healthService.getHealth();

      // Assert
      expect(result).toEqual({
        status: 'ok',
        database: 'connected',
        timestamp: expect.any(String),
      });
      // Verify timestamp is valid ISO 8601
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return error status with disconnected database when DB query fails', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      // Act
      const result = await healthService.getHealth();

      // Assert
      expect(result).toEqual({
        status: 'error',
        database: 'disconnected',
        timestamp: expect.any(String),
      });
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should return error status when DB query times out', async () => {
      // Arrange
      const timeoutError = new Error('Query timeout');
      timeoutError.name = 'PrismaClientKnownRequestError';
      mockPrisma.$queryRaw.mockRejectedValue(timeoutError);

      // Act
      const result = await healthService.getHealth();

      // Assert
      expect(result).toEqual({
        status: 'error',
        database: 'disconnected',
        timestamp: expect.any(String),
      });
    });

    it('should execute SELECT 1 query for health check', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      // Act
      await healthService.getHealth();

      // Assert
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});