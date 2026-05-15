// @ts-check
import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Run tests sequentially to be considerate of the public API
  fullyParallel: false,
  workers: 1,

  // Retry failed tests once in CI
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'reports/test-results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://restful-booker.herokuapp.com',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    // Capture on failure for debugging
    screenshot: 'off',
    trace: 'on-first-retry',
  },

  // Global setup / teardown hooks
  globalSetup: './config/global-setup.js',
});
