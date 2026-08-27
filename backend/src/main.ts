import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createHealthRoutes } from './routes/health.routes';
import { createProductCategoryRoutes } from './routes/product-category.routes';
import { createPromotionRoutes } from './routes/promotion.routes';
import { HealthService } from './services/health.service';
import { ProductCategoryService } from './services/product-category.service';
import { PromotionService } from './services/promotion.service';
import { SummaryService } from './services/summary.service';
import { errorHandler } from './middleware/error-handler';

export interface AppDependencies {
  healthService?: HealthService;
  productCategoryService?: ProductCategoryService;
  promotionService?: PromotionService;
  summaryService?: SummaryService;
}

export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));

  // Logging
  app.use(morgan('combined'));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health routes
  app.use('/', createHealthRoutes(deps.healthService));

  // Product Category routes
  app.use('/', createProductCategoryRoutes(deps.productCategoryService));

  // Promotion routes
  app.use('/', createPromotionRoutes(deps.promotionService, deps.summaryService));

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

// Only start server if this file is run directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = parseInt(process.env.PORT || '3001', 10);
  const app = createApp();
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    
    // Force close after 10s
    setTimeout(() => {
      console.error('Forced shutdown after 10s');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}