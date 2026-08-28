import type { Request, Response } from 'express';
import { HealthService } from '../services/health.service';

export class HealthController {
  private healthService: HealthService;

  constructor(healthService?: HealthService) {
    this.healthService = healthService || new HealthService();
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    const health = await this.healthService.getHealth();
    
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  }
}