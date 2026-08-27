import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../main';
import { prisma } from '../prisma/client';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';

// Create a test schema
const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number().int().positive('Age must be positive'),
  email: z.string().email('Invalid email format'),
});

describe('Validation middleware', () => {
  let app: ReturnType<typeof createApp>;
  let server: any;

  beforeAll(async () => {
    // Create a test app with validation middleware
    const express = (await import('express')).default;
    const testApp = express();
    testApp.use(express.json());
    
    // Add a test route with validation
    testApp.post('/test-validate', validateBody(testSchema), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });
    
    // Add error handler
    const { errorHandler } = await import('../middleware/error-handler');
    testApp.use(errorHandler);
    
    app = testApp;
    server = app.listen(0);
  });

  afterAll(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  it('should allow valid request body', async () => {
    const response = await request(server)
      .post('/test-validate')
      .send({ name: 'John', age: 30, email: 'john@example.com' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('John');
  });

  it('should reject missing required field', async () => {
    const response = await request(server)
      .post('/test-validate')
      .send({ age: 30, email: 'john@example.com' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'body.name', message: 'Required' })
    );
  });

  it('should reject invalid email format', async () => {
    const response = await request(server)
      .post('/test-validate')
      .send({ name: 'John', age: 30, email: 'invalid-email' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'body.email', message: 'Invalid email format' })
    );
  });

  it('should reject negative age', async () => {
    const response = await request(server)
      .post('/test-validate')
      .send({ name: 'John', age: -5, email: 'john@example.com' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toContainEqual(
      expect.objectContaining({ field: 'body.age', message: 'Age must be positive' })
    );
  });

  it('should reject non-integer age', async () => {
    const response = await request(server)
      .post('/test-validate')
      .send({ name: 'John', age: 30.5, email: 'john@example.com' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});