import { Router } from 'express';
import { 
  PromotionController, 
  validateCreatePromotion, 
  validateListPromotions,
  validatePromotionId,
  validateUpdatePromotion,
} from '../controllers/promotion.controller';
import type { PromotionService } from '../services/promotion.service';
import type { SummaryService } from '../services/summary.service';
import type { Request, Response, NextFunction } from 'express';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export function createPromotionRoutes(
  promotionService?: PromotionService,
  summaryService?: SummaryService
): Router {
  const router = Router();
  const controller = new PromotionController(promotionService, summaryService);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post('/api/promotions', validateCreatePromotion, asyncHandler((req, res) => controller.create(req, res)));
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/api/promotions', validateListPromotions, asyncHandler((req, res) => controller.list(req, res)));
  router.get('/api/promotions/summary', asyncHandler((req, res) => controller.getSummary(req, res)));
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.get('/api/promotions/:id', validatePromotionId, asyncHandler((req, res) => controller.getById(req, res)));
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.patch('/api/promotions/:id', validatePromotionId, validateUpdatePromotion, asyncHandler((req, res) => controller.update(req, res)));
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post('/api/promotions/:id/activate', validatePromotionId, asyncHandler((req, res) => controller.activate(req, res)));
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.post('/api/promotions/:id/finalize', validatePromotionId, asyncHandler((req, res) => controller.finalize(req, res)));
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  router.delete('/api/promotions/:id', validatePromotionId, asyncHandler((req, res) => controller.delete(req, res)));

  return router;
}