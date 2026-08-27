import { Router } from 'express';
import { ProductCategoryController } from '../controllers/product-category.controller';
import { ProductCategoryService } from '../services/product-category.service';

export function createProductCategoryRoutes(
  productCategoryService?: ProductCategoryService
): Router {
  const router = Router();
  const controller = new ProductCategoryController(productCategoryService);

  router.get('/api/products-categories', (req, res) => controller.listAll(req, res));

  return router;
}