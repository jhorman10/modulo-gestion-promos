import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { formatError, ErrorCode } from '../utils/errors';

/**
 * Creates a middleware that validates request against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware
 */
export function validate(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate body, query, and params
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          formatError(ErrorCode.VALIDATION_ERROR, 'Request validation failed', [
            ...error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          ])
        );
        return;
      }
      next(error);
    }
  };
}

/**
 * Validates only the request body
 */
export function validateBody(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          formatError(ErrorCode.VALIDATION_ERROR, 'Request validation failed', [
            ...error.errors.map(e => ({
              field: `body.${e.path.join('.')}`,
              message: e.message,
            })),
          ])
        );
        return;
      }
      next(error);
    }
  };
}

/**
 * Validates only the query parameters
 */
export function validateQuery(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          formatError(ErrorCode.VALIDATION_ERROR, 'Request validation failed', [
            ...error.errors.map(e => ({
              field: `query.${e.path.join('.')}`,
              message: e.message,
            })),
          ])
        );
        return;
      }
      next(error);
    }
  };
}

/**
 * Validates only the route parameters
 */
export function validateParams(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          formatError(ErrorCode.VALIDATION_ERROR, 'Request validation failed', [
            ...error.errors.map(e => ({
              field: `params.${e.path.join('.')}`,
              message: e.message,
            })),
          ])
        );
        return;
      }
      next(error);
    }
  };
}