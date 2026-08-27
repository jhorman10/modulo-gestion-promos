import { Router } from 'express';
import { 
  PromotionController, 
  validateCreatePromotion, 
  validateListPromotions,
  validatePromotionId,
  validateUpdatePromotion,
} from '../controllers/promotion.controller';
import { PromotionService } from '../services/promotion.service';
import { SummaryService } from '../services/summary.service';

export function createPromotionRoutes(
  promotionService?: PromotionService,
  summaryService?: SummaryService
): Router {
  const router = Router();
  const controller = new PromotionController(promotionService, summaryService);

  router.post('/api/promotions', validateCreatePromotion, (req, res) => controller.create(req, res));
  router.get('/api/promotions', validateListPromotions, (req, res) => controller.list(req, res));
  router.get('/api/promotions/summary', (req, res) => controller.getSummary(req, res));
  router.get('/api/promotions/:id', validatePromotionId, (req, res) => controller.getById(req, res));
  router.patch('/api/promotions/:id', validatePromotionId, validateUpdatePromotion, (req, res) => controller.update(req, res));
  router.post('/api/promotions/:id/activate', validatePromotionId, (req, res) => controller.activate(req, res));
  router.post('/api/promotions/:id/finalize', validatePromotionId, (req, res) => controller.finalize(req, res));
  router.delete('/api/promotions/:id', validatePromotionId, (req, res) => controller.delete(req, res));

  return router;
}