import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { HealthService } from '../services/health.service';

export function createHealthRoutes(healthService?: HealthService): Router {
  const router = Router();
  const healthController = new HealthController(healthService);

  router.get('/health', (req, res) => healthController.getHealth(req, res));

  return router;
}