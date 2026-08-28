/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import type { Request, Response } from 'express';
import type { PromotionCreateInput, PromotionListQuery, PromotionUpdateInput } from '../services/promotion.service';
import { PromotionService } from '../services/promotion.service';
import { SummaryService } from '../services/summary.service';
import { createPromotionSchema, promotionQuerySchema, promotionParamsSchema, updatePromotionSchema } from '../validators/promotion.validator';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';

export class PromotionController {
  private service: PromotionService;
  private summaryService: SummaryService;

  constructor(service?: PromotionService, summaryService?: SummaryService) {
    this.service = service || new PromotionService();
    this.summaryService = summaryService || new SummaryService();
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const input = req.body as PromotionCreateInput;
      const promotion = await this.service.create(input);
      res.status(201).json(promotion);
    } catch (error: any) {
      if (error.statusCode === 400) {
        res.status(400).json({
          error: {
            code: error.code || 'VALIDATION_ERROR',
            message: error.message,
            details: error.details,
          },
        });
        return;
      }
      throw error;
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query as unknown as PromotionListQuery;
      // Convert string query params to proper types
      const listQuery: PromotionListQuery = {
        page: query.page ? parseInt(query.page as string, 10) : undefined,
        size: query.size ? parseInt(query.size as string, 10) : undefined,
        status: query.status,
        product_id: query.product_id,
        category_id: query.category_id,
        start_date_from: query.start_date_from ? new Date(query.start_date_from as string) : undefined,
        end_date_to: query.end_date_to ? new Date(query.end_date_to as string) : undefined,
      };
      const result = await this.service.list(listQuery);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.statusCode === 400) {
        res.status(400).json({
          error: {
            code: error.code || 'VALIDATION_ERROR',
            message: error.message,
            details: error.details,
          },
        });
        return;
      }
      throw error;
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const promotion = await this.service.getById(id);
      if (!promotion) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Promotion not found',
          },
        });
        return;
      }
      res.status(200).json(promotion);
    } catch (error: any) {
      if (error.statusCode === 400) {
        res.status(400).json({
          error: {
            code: error.code || 'VALIDATION_ERROR',
            message: error.message,
            details: error.details,
          },
        });
        return;
      }
      throw error;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const input = req.body as PromotionUpdateInput;
      const promotion = await this.service.update(id, input);
      res.status(200).json(promotion);
    } catch (error: any) {
      if (error.statusCode === 400 || error.statusCode === 404 || error.statusCode === 409) {
        res.status(error.statusCode).json({
          error: {
            code: error.code || 'VALIDATION_ERROR',
            message: error.message,
            details: error.details,
          },
        });
        return;
      }
      throw error;
    }
  }

  async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const promotion = await this.service.activate(id);
      res.status(200).json(promotion);
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 409) {
        res.status(error.statusCode).json({
          error: {
            code: error.code || 'INVALID_STATE_TRANSITION',
            message: error.message,
          },
        });
        return;
      }
      throw error;
    }
  }

  async finalize(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const promotion = await this.service.finalize(id);
      res.status(200).json(promotion);
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 409) {
        res.status(error.statusCode).json({
          error: {
            code: error.code || 'INVALID_STATE_TRANSITION',
            message: error.message,
          },
        });
        return;
      }
      throw error;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.softDelete(id);
      res.status(204).send();
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 409) {
        res.status(error.statusCode).json({
          error: {
            code: error.code || 'INVALID_STATE_TRANSITION',
            message: error.message,
          },
        });
        return;
      }
      throw error;
    }
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    const summary = await this.summaryService.getSummary();
    res.status(200).json(summary);
  }
}

/**
 * Validation middleware for promotion creation
 */
export const validateCreatePromotion = validateBody(createPromotionSchema);

/**
 * Validation middleware for promotion list query
 */
export const validateListPromotions = validateQuery(promotionQuerySchema);

/**
 * Validation middleware for promotion ID param
 */
export const validatePromotionId = validateParams(promotionParamsSchema);

/**
 * Validation middleware for promotion update
 */
export const validateUpdatePromotion = validateBody(updatePromotionSchema);