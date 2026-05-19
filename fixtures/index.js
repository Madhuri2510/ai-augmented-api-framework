/**
 * fixtures/index.js — extends Playwright's `test` with project-specific fixtures.
 *
 * Fixtures handle the repetitive setup/teardown (get a token, create a booking,
 * clean up after) so test files stay focused on assertions.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/index.js';
 */

import { test as base, expect } from '@playwright/test';
import { ApiClient } from '../helpers/ApiClient.js';
import { DataFactory } from '../helpers/DataFactory.js';
import { config } from '../config/environments.js';

export const test = base.extend({

  /**
   * apiClient — a pre-configured ApiClient instance scoped to each test.
   */
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request);
    await use(client);
  },

  /**
   * authToken — a fresh auth token for tests that need authenticated requests.
   * Automatically re-generated per test to avoid token expiry issues.
   */
  authToken: async ({ apiClient }, use) => {
    const token = await apiClient.getAuthToken();
    await use(token);
  },

  /**
   * testBooking — creates a booking before the test and deletes it after,
   * ensuring isolation.  If deletion fails (e.g. the test already deleted it),
   * the error is swallowed so teardown doesn't mask the real test failure.
   */
  testBooking: async ({ apiClient, authToken }, use) => {
    const bookingData = DataFactory.createBooking();
    const createRes = await apiClient.createBooking(bookingData);

    if (!createRes.ok()) {
      throw new Error(
        `Fixture: Failed to create test booking — ${createRes.status()} ${createRes.statusText()}`
      );
    }

    const { bookingid, booking } = await createRes.json();

    // Small throttle — be polite to the public API
    await sleep(config.throttleMs);

    await use({ id: bookingid, data: booking });

    // Teardown: best-effort cleanup
    try {
      await apiClient.deleteBooking(bookingid, authToken);
    } catch {
      // Swallow — the test may have deleted it intentionally
    }
  },
});

export { expect };

// Utility //
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
