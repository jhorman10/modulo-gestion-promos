import { z } from 'zod';

/**
 * Frontend Zod schema for promotion form validation.
 * Mirrors backend/src/validators/promotion.validator.ts createPromotionSchema.
 */
export const PromotionFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must not exceed 200 characters'),
  discount_type: z.enum(['percentage', 'fixed'], {
    errorMap: () => ({ message: 'discount_type must be "percentage" or "fixed"' }),
  }),
  discount_value: z.number().positive('discount_value must be positive'),
  start_date: z.string().min(1, 'start_date is required'),
  end_date: z.string().min(1, 'end_date is required'),
  product_ids: z.array(z.string()).default([]),
  category_ids: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
  // Validate discount_value bounds based on discount_type
  if (data.discount_type === 'percentage') {
    if (data.discount_value < 0.01 || data.discount_value > 1.00) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount_value must be between 0.01 and 1.00',
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

export type PromotionFormData = z.infer<typeof PromotionFormSchema>;
