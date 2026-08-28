import type { PrismaClient, Prisma } from '@prisma/client';
import { ProductCategoryType } from '@prisma/client';
import { prisma } from '../prisma/client';
import type { PaginationQuery } from '../utils/pagination';
import { calculatePagination } from '../utils/pagination';

export interface ProductCategoryListResult {
  products: Array<{ id: string; name: string; type: 'PRODUCT' }>;
  categories: Array<{ id: string; name: string; type: 'CATEGORY' }>;
  pagination: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
  };
}

export interface ProductCategoryListParams extends PaginationQuery {
  type?: 'PRODUCT' | 'CATEGORY';
}

export class ProductCategoryService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  async listAll(params: ProductCategoryListParams = {} as ProductCategoryListParams): Promise<ProductCategoryListResult> {
    const { page = 1, size = 50, type } = params;
    
    // Build where clause
    const where: Prisma.ProductCategoryWhereInput = {};
    if (type) {
      where.type = type;
    }

    // Get total count
    const total = await this.prisma.productCategory.count({ where });

    // Calculate pagination
    const pagination = calculatePagination(page, size, total);

    // Fetch data with pagination
    const items = await this.prisma.productCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (pagination.page - 1) * pagination.size,
      take: pagination.size,
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    // Separate products and categories
    const products = items
      .filter(item => item.type === ProductCategoryType.PRODUCT)
      .map(item => ({
        id: item.id,
        name: item.name,
        type: 'PRODUCT' as const,
      }));

    const categories = items
      .filter(item => item.type === ProductCategoryType.CATEGORY)
      .map(item => ({
        id: item.id,
        name: item.name,
        type: 'CATEGORY' as const,
      }));

    return {
      products,
      categories,
      pagination,
    };
  }
}