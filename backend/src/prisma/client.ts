import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Soft delete middleware - filter out deleted_at on all queries for models that have deletedAt
const modelsWithSoftDelete = ['Promotion'];

prisma.$use(async (params, next) => {
  // Only apply soft delete filter to models that have deletedAt field
  if (!modelsWithSoftDelete.includes(params.model || '')) {
    return next(params);
  }

  // Apply soft delete filter for findUnique, findFirst, findMany, count, etc.
  if (params.action === 'findUnique' || params.action === 'findFirst') {
    params.args.where = {
      ...params.args.where,
      deletedAt: null,
    };
  }
  if (params.action === 'findMany') {
    if (params.args.where) {
      params.args.where.deletedAt = null;
    } else {
      params.args.where = { deletedAt: null };
    }
  }
  if (params.action === 'count' || params.action === 'aggregate' || params.action === 'groupBy') {
    if (params.args.where) {
      params.args.where.deletedAt = null;
    } else {
      params.args.where = { deletedAt: null };
    }
  }
  return next(params);
});
