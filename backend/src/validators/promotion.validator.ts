import { z } from 'zod';
import { paginationQuerySchema } from '../utils/pagination';

/**
 * UUID schema for validation
 */
const uuidSchema = z.string().uuid({ message: 'Must be a valid UUID' });

/**
 * ISO 8601 date schema with refinement for proper format
 */
const isoDateSchema = z.string().refine(
  val => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && val.endsWith('Z');
  },
  { message: 'Must be a valid ISO 8601 date in UTC (ending with Z)' }
);

/**
 * Schema for creating a promotion
 */
export const createPromotionSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200, 'Name must not exceed 200 characters'),
    discount_type: z.enum(['percentage', 'fixed'], {
      errorMap: () => ({ message: 'discount_type must be "percentage" or "fixed"' }),
    }),
    discount_value: z.number().positive('discount_value must be positive'),
    start_date: isoDateSchema,
    end_date: isoDateSchema,
    product_ids: z.array(uuidSchema).default([]),
    category_ids: z.array(uuidSchema).default([]),
  })
  .superRefine((data, ctx) => {
    // Validate discount_value bounds based on discount_type
    if (data.discount_type === 'percentage') {
      if (data.discount_value < 1 || data.discount_value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Percentage discount_value must be between 1 and 100',
          path: ['discount_value'],
        });
      }
    } else if (data.discount_type === 'fixed') {
      if (data.discount_value <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Fixed discount_value must be greater than 0',
          path: ['discount_value'],
        });
      }
    }

    // Validate end_date > start_date
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (endDate <= startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'end_date must be after start_date',
        path: ['end_date'],
      });
    }

    // Validate at least one association (product or category)
    if (data.product_ids.length === 0 && data.category_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one product or category association is required',
        path: ['product_ids'],
      });
    }
  });

/**
 * Schema for updating a promotion (all fields optional)
 */
export const updatePromotionSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(200, 'Name must not exceed 200 characters')
      .optional(),
    discount_type: z
      .enum(['percentage', 'fixed'], {
        errorMap: () => ({ message: 'discount_type must be "percentage" or "fixed"' }),
      })
      .optional(),
    discount_value: z.number().positive('discount_value must be positive').optional(),
    start_date: isoDateSchema.optional(),
    end_date: isoDateSchema.optional(),
    product_ids: z.array(uuidSchema).optional(),
    category_ids: z.array(uuidSchema).optional(),
  })
  .superRefine((data, ctx) => {
    // Only validate discount_value bounds if discount_type is provided
    if (data.discount_type === 'percentage' && data.discount_value !== undefined) {
      if (data.discount_value < 1 || data.discount_value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Percentage discount_value must be between 1 and 100',
          path: ['discount_value'],
        });
      }
    } else if (data.discount_type === 'fixed' && data.discount_value !== undefined) {
      if (data.discount_value <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Fixed discount_value must be greater than 0',
          path: ['discount_value'],
        });
      }
    }

    // Validate end_date > start_date if both provided
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (endDate <= startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'end_date must be after start_date',
          path: ['end_date'],
        });
      }
    }

    // Validate at least one association if both arrays are provided
    if (data.product_ids !== undefined && data.category_ids !== undefined) {
      if (data.product_ids.length === 0 && data.category_ids.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one product or category association is required',
          path: ['product_ids'],
        });
      }
    }
  });

/**
 * Schema for promotion route parameters (id)
 */
export const promotionParamsSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema for promotion list query parameters
 */
export const promotionQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['Programada', 'Activa', 'Finalizada']).optional(),
  product_id: uuidSchema.optional(),
  category_id: uuidSchema.optional(),
  start_date_from: isoDateSchema.optional(),
  end_date_to: isoDateSchema.optional(),
});

/**
 * Type exports for TypeScript inference
 */
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
export type PromotionParams = z.infer<typeof promotionParamsSchema>;
export type PromotionQuery = z.infer<typeof promotionQuerySchema>;
