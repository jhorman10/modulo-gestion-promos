import { Request, Response } from 'express';
import { ProductCategoryService } from '../services/product-category.service';
import { paginationQuerySchema } from '../utils/pagination';
import { z } from 'zod';

const productCategoryQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['PRODUCT', 'CATEGORY']).optional(),
});

export class ProductCategoryController {
  private service: ProductCategoryService;

  constructor(service?: ProductCategoryService) {
    this.service = service || new ProductCategoryService();
  }

  async listAll(req: Request, res: Response): Promise<void> {
    // Validate query parameters
    const validationResult = productCategoryQuerySchema.safeParse(req.query);
    
    if (!validationResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
      return;
    }

    const result = await this.service.listAll(validationResult.data);
    res.status(200).json(result);
  }
}