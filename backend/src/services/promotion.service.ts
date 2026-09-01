/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import type { PrismaClient, Prisma } from '@prisma/client';
import { PromotionStatus, DiscountType, ProductCategoryType } from '@prisma/client';
import { prisma } from '../prisma/client';
import type { PromotionStatus as PromotionStatusType } from './promotion-state-machine';
import { PromotionStateMachine } from './promotion-state-machine';
import { Decimal } from '@prisma/client/runtime/library';
import { createAppError, ErrorCode } from '../utils/errors';
import { calculatePagination } from '../utils/pagination';

export interface PromotionCreateInput {
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: Date;
  end_date: Date;
  product_ids: string[];
  category_ids: string[];
}

export interface PromotionUpdateInput {
  name?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  start_date?: Date;
  end_date?: Date;
  product_ids?: string[];
  category_ids?: string[];
}

export interface PromotionWithAssociations {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  status: PromotionStatusType;
  products: Array<{ id: string; name: string; type: 'PRODUCT' }>;
  categories: Array<{ id: string; name: string; type: 'CATEGORY' }>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PromotionListQuery {
  page?: number;
  size?: number;
  status?: 'Programada' | 'Activa' | 'Finalizada';
  product_id?: string;
  category_id?: string;
  start_date_from?: Date;
  end_date_to?: Date;
}

export interface PromotionListResult {
  data: PromotionWithAssociations[];
  pagination: {
    total: number;
    page: number;
    size: number;
    total_pages: number;
  };
}

export class PromotionService {
  private prisma: PrismaClient;
  private stateMachine: PromotionStateMachine;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
    this.stateMachine = new PromotionStateMachine();
  }

  /**
   * Create a new promotion with product/category associations
   */
  async create(input: PromotionCreateInput): Promise<PromotionWithAssociations> {
    // Validate product and category IDs exist
    const allIds = [...input.product_ids, ...input.category_ids];
    const existingCategories = await this.prisma.productCategory.findMany({
      where: { id: { in: allIds } },
      select: { id: true, name: true, type: true },
    });

    if (existingCategories.length !== allIds.length) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 'Product or category not found', 400);
    }

    // Reject if any active/programmed promotion overlaps on time AND products/categories
    await this.assertNoOverlap({
      start_date: input.start_date,
      end_date: input.end_date,
      product_ids: input.product_ids,
      category_ids: input.category_ids,
    });

    // Create promotion and junction records in a transaction
    const promotion = await this.prisma.$transaction(async tx => {
      // Create promotion
      const created = await tx.promotion.create({
        data: {
          name: input.name,
          discountType:
            input.discount_type === 'percentage' ? DiscountType.PERCENTAGE : DiscountType.FIXED,
          discountValue: new Decimal(input.discount_value.toFixed(2)),
          startDate: input.start_date,
          endDate: input.end_date,
          status: PromotionStatus.PROGRAMADA,
        },
      });

      // Create junction records for products
      if (input.product_ids.length > 0) {
        await tx.promotionProductCategory.createMany({
          data: input.product_ids.map(productId => ({
            promotionId: created.id,
            productCategoryId: productId,
            associationType: ProductCategoryType.PRODUCT,
          })),
        });
      }

      // Create junction records for categories
      if (input.category_ids.length > 0) {
        await tx.promotionProductCategory.createMany({
          data: input.category_ids.map(categoryId => ({
            promotionId: created.id,
            productCategoryId: categoryId,
            associationType: ProductCategoryType.CATEGORY,
          })),
        });
      }

      return created;
    });

    // Fetch associations for response
    const associations = await this.prisma.promotionProductCategory.findMany({
      where: { promotionId: promotion.id },
      include: { productCategory: true },
    });

    const products = associations
      .filter(a => a.associationType === ProductCategoryType.PRODUCT)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'PRODUCT' as const,
      }));

    const categories = associations
      .filter(a => a.associationType === ProductCategoryType.CATEGORY)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'CATEGORY' as const,
      }));

    return this.mapPromotionToResponse(promotion, products, categories);
  }

  /**
   * Assert that no active/programmed promotion overlaps the given range and
   * product/category associations. Throws PROMOTION_OVERLAP if a conflict exists.
   *
   * Overlap rule: two ranges [start, end] overlap iff
   *   start_a < end_b AND end_a > start_b
   * (strict). Adjacent ranges (end == start) do NOT overlap.
   *
   * Existing promotion is considered for overlap only if:
   *   - status is PROGRAMADA or ACTIVA (FINALIZADA excluded)
   *   - deletedAt is null
   *   - shares at least one product OR category with the candidate (junction table)
   *
   * @param params.start_date - candidate start date
   * @param params.end_date - candidate end date
   * @param params.product_ids - candidate product association IDs
   * @param params.category_ids - candidate category association IDs
   * @param params.excludePromotionId - promotion id to exclude (used for update)
   */
  private async assertNoOverlap(params: {
    start_date: Date;
    end_date: Date;
    product_ids: string[];
    category_ids: string[];
    excludePromotionId?: string;
  }): Promise<void> {
    const overlap = await this.findOverlappingPromotion(params);
    if (!overlap) return;

    const fmt = (d: Date) => d.toISOString();
    throw createAppError(
      ErrorCode.PROMOTION_OVERLAP,
      `Promotion overlaps with existing promotion "${overlap.name}" (${fmt(overlap.startDate)} - ${fmt(overlap.endDate)})`,
      409
    );
  }

  /**
   * Find an existing PROGRAMADA/ACTIVA, non-deleted promotion that overlaps the
   * given range and shares at least one product or category. Returns the
   * conflicting promotion (without junction rows) or null.
   *
   * @see assertNoOverlap for the full overlap rule.
   */
  private async findOverlappingPromotion(params: {
    start_date: Date;
    end_date: Date;
    product_ids: string[];
    category_ids: string[];
    excludePromotionId?: string;
  }) {
    const { start_date, end_date, product_ids, category_ids, excludePromotionId } = params;

    // No associations => no possible overlap on products/categories
    if (product_ids.length === 0 && category_ids.length === 0) {
      return null;
    }

    const conflictingIds = new Set<string>([...product_ids, ...category_ids]);

    return this.prisma.promotion.findFirst({
      where: {
        deletedAt: null,
        status: { in: [PromotionStatus.PROGRAMADA, PromotionStatus.ACTIVA] },
        // Strict date overlap: start_a < end_b AND end_a > start_b
        startDate: { lt: end_date },
        endDate: { gt: start_date },
        // Shares at least one product/category through the junction table
        associations: {
          some: { productCategoryId: { in: Array.from(conflictingIds) } },
        },
        ...(excludePromotionId ? { id: { not: excludePromotionId } } : {}),
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });
  }

  /**
   * Map Prisma enum status to API format
   */
  private mapStatusToApi(status: PromotionStatus): 'Programada' | 'Activa' | 'Finalizada' {
    switch (status) {
      case PromotionStatus.PROGRAMADA:
        return 'Programada';
      case PromotionStatus.ACTIVA:
        return 'Activa';
      case PromotionStatus.FINALIZADA:
        return 'Finalizada';
      default:
        return 'Programada';
    }
  }

  /**
   * Map Prisma enum status to API format
   */
  private mapPromotionToResponse(
    promotion: any,
    products: Array<{ id: string; name: string; type: 'PRODUCT' }>,
    categories: Array<{ id: string; name: string; type: 'CATEGORY' }>
  ): PromotionWithAssociations {
    // Map Prisma enum status to API format
    const statusMap: Record<string, PromotionStatusType> = {
      PROGRAMADA: 'Programada',
      ACTIVA: 'Activa',
      FINALIZADA: 'Finalizada',
    };

    return {
      id: promotion.id,
      name: promotion.name,
      discount_type: promotion.discountType === DiscountType.PERCENTAGE ? 'percentage' : 'fixed',
      discount_value:
        promotion.discountValue instanceof Decimal
          ? Number(promotion.discountValue.toFixed(2))
          : Number(promotion.discountValue),
      start_date: promotion.startDate.toISOString(),
      end_date: promotion.endDate.toISOString(),
      status: statusMap[promotion.status] || promotion.status,
      products,
      categories,
      created_at: promotion.createdAt.toISOString(),
      updated_at: promotion.updatedAt.toISOString(),
      deleted_at: promotion.deletedAt?.toISOString() ?? null,
    };
  }

  /**
   * List promotions with pagination and filters
   */
  async list(query: PromotionListQuery): Promise<PromotionListResult> {
    const page = Math.max(1, Math.floor(query.page || 1));
    const size = Math.max(1, Math.min(100, Math.floor(query.size || 10)));

    // Build where clause
    const where: Prisma.PromotionWhereInput = {
      deletedAt: null,
    };

    if (query.status) {
      where.status =
        query.status === 'Programada'
          ? PromotionStatus.PROGRAMADA
          : query.status === 'Activa'
            ? PromotionStatus.ACTIVA
            : PromotionStatus.FINALIZADA;
    }

    if (query.product_id) {
      where.associations = {
        some: {
          productCategoryId: query.product_id,
          associationType: ProductCategoryType.PRODUCT,
        },
      };
    }

    if (query.category_id) {
      where.associations = {
        ...where.associations,
        some: {
          ...(where.associations as Prisma.PromotionWhereInput)?.associations?.some,
          productCategoryId: query.category_id,
          associationType: ProductCategoryType.CATEGORY,
        },
      } as Prisma.PromotionWhereInput['associations'];
    }

    if (query.start_date_from) {
      where.startDate = { gte: query.start_date_from };
    }

    if (query.end_date_to) {
      where.endDate = { lte: query.end_date_to };
    }

    // Get total count
    const total = await this.prisma.promotion.count({ where });

    // Get promotions with pagination
    const promotions = await this.prisma.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    });

    // Fetch associations for all promotions
    const promotionIds = promotions.map(p => p.id);
    const associations = await this.prisma.promotionProductCategory.findMany({
      where: { promotionId: { in: promotionIds } },
      include: { productCategory: true },
    });

    // Map promotions to response format
    const data = promotions.map(promotion => {
      const promoAssociations = associations.filter(a => a.promotionId === promotion.id);
      const products = promoAssociations
        .filter(a => a.associationType === ProductCategoryType.PRODUCT)
        .map(a => ({
          id: a.productCategory.id,
          name: a.productCategory.name,
          type: 'PRODUCT' as const,
        }));
      const categories = promoAssociations
        .filter(a => a.associationType === ProductCategoryType.CATEGORY)
        .map(a => ({
          id: a.productCategory.id,
          name: a.productCategory.name,
          type: 'CATEGORY' as const,
        }));

      return this.mapPromotionToResponse(promotion, products, categories);
    });

    return {
      data,
      pagination: calculatePagination(page, size, total),
    };
  }

  /**
   * Get promotion by ID with associations
   */
  async getById(id: string): Promise<PromotionWithAssociations | null> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      return null;
    }

    // Fetch associations
    const associations = await this.prisma.promotionProductCategory.findMany({
      where: { promotionId: promotion.id },
      include: { productCategory: true },
    });

    const products = associations
      .filter(a => a.associationType === ProductCategoryType.PRODUCT)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'PRODUCT' as const,
      }));

    const categories = associations
      .filter(a => a.associationType === ProductCategoryType.CATEGORY)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'CATEGORY' as const,
      }));

    return this.mapPromotionToResponse(promotion, products, categories);
  }

  /**
   * Update promotion (only if not Finalizada)
   */
  async update(id: string, input: PromotionUpdateInput): Promise<PromotionWithAssociations> {
    // Check if promotion exists and get current status
    const existing = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!existing) {
      throw createAppError(ErrorCode.NOT_FOUND, 'Promotion not found', 404);
    }

    // Validate state transition (Finalizada is immutable)
    const apiStatus = this.mapStatusToApi(existing.status);
    const stateValidation = this.stateMachine.validateUpdate(apiStatus);
    if (!stateValidation.allowed) {
      throw createAppError(ErrorCode.INVALID_STATE_TRANSITION, stateValidation.error!.message, 409);
    }

    // Validate product/category IDs if provided
    if (input.product_ids || input.category_ids) {
      const allIds = [...(input.product_ids || []), ...(input.category_ids || [])];
      if (allIds.length > 0) {
        const existingCategories = await this.prisma.productCategory.findMany({
          where: { id: { in: allIds } },
          select: { id: true, name: true, type: true },
        });
        if (existingCategories.length !== allIds.length) {
          throw createAppError(ErrorCode.VALIDATION_ERROR, 'Product or category not found', 400);
        }
      }
    }

    // If any field that affects overlap is changing, validate no other active/programmed
    // promotion overlaps with the resulting range + associations.
    if (
      input.start_date !== undefined ||
      input.end_date !== undefined ||
      input.product_ids !== undefined ||
      input.category_ids !== undefined
    ) {
      // Resolve effective post-update associations: keep current ones if not replaced.
      let effectiveProductIds = input.product_ids;
      let effectiveCategoryIds = input.category_ids;

      if (effectiveProductIds === undefined || effectiveCategoryIds === undefined) {
        const currentAssociations = await this.prisma.promotionProductCategory.findMany({
          where: { promotionId: id },
          select: { productCategoryId: true, associationType: true },
        });
        if (effectiveProductIds === undefined) {
          effectiveProductIds = currentAssociations
            .filter(a => a.associationType === ProductCategoryType.PRODUCT)
            .map(a => a.productCategoryId);
        }
        if (effectiveCategoryIds === undefined) {
          effectiveCategoryIds = currentAssociations
            .filter(a => a.associationType === ProductCategoryType.CATEGORY)
            .map(a => a.productCategoryId);
        }
      }

      await this.assertNoOverlap({
        start_date: input.start_date ?? existing.startDate,
        end_date: input.end_date ?? existing.endDate,
        product_ids: effectiveProductIds,
        category_ids: effectiveCategoryIds,
        excludePromotionId: id,
      });
    }

    // Update promotion and associations in a transaction
    const promotion = await this.prisma.$transaction(async tx => {
      // Build update data
      const updateData: Prisma.PromotionUpdateInput = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.discount_type !== undefined) {
        updateData.discountType =
          input.discount_type === 'percentage' ? DiscountType.PERCENTAGE : DiscountType.FIXED;
      }
      if (input.discount_value !== undefined) {
        updateData.discountValue = new Decimal(input.discount_value.toFixed(2));
      }
      if (input.start_date !== undefined) updateData.startDate = input.start_date;
      if (input.end_date !== undefined) updateData.endDate = input.end_date;

      // Update promotion
      const updated = await tx.promotion.update({
        where: { id },
        data: updateData,
      });

      // Update associations if provided
      if (input.product_ids !== undefined || input.category_ids !== undefined) {
        // Delete existing associations
        await tx.promotionProductCategory.deleteMany({
          where: { promotionId: id },
        });

        // Create new product associations
        if (input.product_ids && input.product_ids.length > 0) {
          await tx.promotionProductCategory.createMany({
            data: input.product_ids.map(productId => ({
              promotionId: id,
              productCategoryId: productId,
              associationType: ProductCategoryType.PRODUCT,
            })),
          });
        }

        // Create new category associations
        if (input.category_ids && input.category_ids.length > 0) {
          await tx.promotionProductCategory.createMany({
            data: input.category_ids.map(categoryId => ({
              promotionId: id,
              productCategoryId: categoryId,
              associationType: ProductCategoryType.CATEGORY,
            })),
          });
        }
      }

      return updated;
    });

    // Fetch updated associations
    const associations = await this.prisma.promotionProductCategory.findMany({
      where: { promotionId: promotion.id },
      include: { productCategory: true },
    });

    const products = associations
      .filter(a => a.associationType === ProductCategoryType.PRODUCT)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'PRODUCT' as const,
      }));

    const categories = associations
      .filter(a => a.associationType === ProductCategoryType.CATEGORY)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'CATEGORY' as const,
      }));

    return this.mapPromotionToResponse(promotion, products, categories);
  }

  /**
   * Activate promotion (Programada -> Activa)
   */
  async activate(id: string): Promise<PromotionWithAssociations> {
    const existing = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!existing) {
      throw createAppError(ErrorCode.NOT_FOUND, 'Promotion not found', 404);
    }

    // Validate state transition
    const apiStatus = this.mapStatusToApi(existing.status);
    const stateValidation = this.stateMachine.validateActivate(
      apiStatus,
      existing.startDate,
      existing.endDate,
      new Date()
    );
    if (!stateValidation.allowed) {
      throw createAppError(ErrorCode.INVALID_STATE_TRANSITION, stateValidation.error!.message, 409);
    }

    // Update status to Activa
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: { status: PromotionStatus.ACTIVA },
    });

    // Fetch associations
    const associations = await this.prisma.promotionProductCategory.findMany({
      where: { promotionId: promotion.id },
      include: { productCategory: true },
    });

    const products = associations
      .filter(a => a.associationType === ProductCategoryType.PRODUCT)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'PRODUCT' as const,
      }));

    const categories = associations
      .filter(a => a.associationType === ProductCategoryType.CATEGORY)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'CATEGORY' as const,
      }));

    return this.mapPromotionToResponse(promotion, products, categories);
  }

  /**
   * Finalize promotion (Activa -> Finalizada)
   */
  async finalize(id: string): Promise<PromotionWithAssociations> {
    const existing = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!existing) {
      throw createAppError(ErrorCode.NOT_FOUND, 'Promotion not found', 404);
    }

    // Validate state transition
    const apiStatus = this.mapStatusToApi(existing.status);
    const stateValidation = this.stateMachine.validateFinalize(apiStatus);
    if (!stateValidation.allowed) {
      throw createAppError(ErrorCode.INVALID_STATE_TRANSITION, stateValidation.error!.message, 409);
    }

    // Update status to Finalizada
    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: { status: PromotionStatus.FINALIZADA },
    });

    // Fetch associations
    const associations = await this.prisma.promotionProductCategory.findMany({
      where: { promotionId: promotion.id },
      include: { productCategory: true },
    });

    const products = associations
      .filter(a => a.associationType === ProductCategoryType.PRODUCT)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'PRODUCT' as const,
      }));

    const categories = associations
      .filter(a => a.associationType === ProductCategoryType.CATEGORY)
      .map(a => ({
        id: a.productCategory.id,
        name: a.productCategory.name,
        type: 'CATEGORY' as const,
      }));

    return this.mapPromotionToResponse(promotion, products, categories);
  }

  /**
   * Soft delete promotion (only Programada)
   */
  async softDelete(id: string): Promise<void> {
    const existing = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!existing) {
      throw createAppError(ErrorCode.NOT_FOUND, 'Promotion not found', 404);
    }

    // Validate state transition
    const apiStatus = this.mapStatusToApi(existing.status);
    const stateValidation = this.stateMachine.validateDelete(apiStatus);
    if (!stateValidation.allowed) {
      throw createAppError(ErrorCode.INVALID_STATE_TRANSITION, stateValidation.error!.message, 409);
    }

    // Soft delete
    await this.prisma.promotion.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
