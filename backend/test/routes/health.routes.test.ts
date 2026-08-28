/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-misused-promises */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/main';
import { prisma } from '../../src/prisma/client';

describe('GET /health integration', () => {
  let app: ReturnType<typeof createApp>;
  let server: any;

  beforeAll(async () => {
    app = createApp();
    server = app.listen(0);
  });

  afterAll(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up any test data if needed
  });

  it('should return 200 with ok status when database is connected', async () => {
    const response = await request(server).get('/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      database: 'connected',
      timestamp: expect.any(String),
    });
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
  });

  it('should return response within 2 seconds', async () => {
    const start = Date.now();
    await request(server).get('/health').expect(200);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('should not require authentication', async () => {
    await request(server).get('/health').expect(200);
    // No auth headers sent, should still work
  });
});
