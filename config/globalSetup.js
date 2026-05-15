/**
 * Global setup — runs once before the entire test suite.
 * Verifies the API is reachable before tests start so we fail fast
  */

import { request } from '@playwright/test';
import { config } from './environments.js';

export default async function globalSetup() {
  console.log('\n🔍 Verifying API health before test run...');

  const ctx = await request.newContext({ baseURL: config.baseURL });

  try {
    const res = await ctx.get(config.endpoints.health);

    if (res.status() !== 201) {
      throw new Error(
        `Health check failed — expected 201, got ${res.status()}. ` +
        `Is ${config.baseURL} reachable?`
      );
    }

    console.log(`✅ API is healthy at ${config.baseURL}\n`);
  } catch (err) {
    console.error(' API health check failed:', err.message);
    throw err;
  } finally {
    await ctx.dispose();
  }
}