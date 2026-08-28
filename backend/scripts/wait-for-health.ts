#!/usr/bin/env node
/**
 * wait-for-health.ts
 * Waits for the backend health endpoint to return 200 OK.
 * Used by CI/CD and smoke tests before running E2E tests.
 *
 * Usage: npx tsx backend/scripts/wait-for-health.ts [url] [timeout]
 * Default URL: http://localhost:3001/health
 * Default timeout: 60000ms (60s)
 */

const HEALTH_URL = process.argv[2] || 'http://localhost:3001/health';
const TIMEOUT_MS = parseInt(process.argv[3] || '60000', 10);
const INITIAL_INTERVAL_MS = 1000;
const MAX_INTERVAL_MS = 10000;

async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(): Promise<void> {
  const startTime = Date.now();
  let interval = INITIAL_INTERVAL_MS;
  let attempt = 0;

  console.log(`Waiting for health check at ${HEALTH_URL}...`);
  console.log(`Timeout: ${TIMEOUT_MS}ms`);

  while (Date.now() - startTime < TIMEOUT_MS) {
    attempt++;
    const isHealthy = await checkHealth();

    if (isHealthy) {
      console.log(`Health check passed on attempt ${attempt} (${Date.now() - startTime}ms)`);
      return;
    }

    console.log(`Attempt ${attempt}: not ready, retrying in ${interval}ms...`);
    await new Promise((resolve) => setTimeout(resolve, interval));

    // Exponential backoff with cap
    interval = Math.min(interval * 1.5, MAX_INTERVAL_MS);
  }

  console.error(`Health check failed after ${attempt} attempts (${TIMEOUT_MS}ms timeout)`);
  process.exit(1);
}

waitForHealth().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
