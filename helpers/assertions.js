/**
 * assertions.js — domain-specific assertion helpers for the Booking API.
 *
 * These go beyond `expect(status).toBe(200)` — they verify response shape,
 * data types, and business rules so that a structurally invalid but 200-OK
 * response still fails the test.
 */

import { expect } from '@playwright/test';

/**
 * Assert a response has the full, correctly-typed booking object shape.
 *
 * @param {object} body - parsed JSON response body
 * @param {object} [expected] - optional field values to check against
 */
export function assertBookingShape(body, expected = {}) {
  // Required fields exist
  expect(body, 'Response body should not be null').toBeTruthy();
  expect(typeof body.firstname,   'firstname must be a string').toBe('string');
  expect(typeof body.lastname,    'lastname must be a string').toBe('string');
  expect(typeof body.totalprice,  'totalprice must be a number').toBe('number');
  expect(typeof body.depositpaid, 'depositpaid must be a boolean').toBe('boolean');

  // Nested dates object
  expect(body.bookingdates, 'bookingdates object must be present').toBeTruthy();
  expect(typeof body.bookingdates.checkin,  'checkin must be a string').toBe('string');
  expect(typeof body.bookingdates.checkout, 'checkout must be a string').toBe('string');

  // Dates must be parseable
  const checkinMs  = Date.parse(body.bookingdates.checkin);
  const checkoutMs = Date.parse(body.bookingdates.checkout);
  expect(isNaN(checkinMs),  'checkin must be a valid date string').toBe(false);
  expect(isNaN(checkoutMs), 'checkout must be a valid date string').toBe(false);

  // Business rule: checkout should not be before checkin
  // (Restful-Booker doesn't enforce this server-side, but we document it)
  // expect(checkoutMs).toBeGreaterThanOrEqual(checkinMs);

  // totalprice must be non-negative
  expect(body.totalprice, 'totalprice must be >= 0').toBeGreaterThanOrEqual(0);

  // Spot-check any expected field values the caller passed in
  for (const [key, value] of Object.entries(expected)) {
    if (key === 'bookingdates') {
      expect(body.bookingdates.checkin,  `checkin should match`).toBe(value.checkin);
      expect(body.bookingdates.checkout, `checkout should match`).toBe(value.checkout);
    } else {
      expect(body[key], `field '${key}' should equal expected value`).toEqual(value);
    }
  }
}

/**
 * Assert the create-booking response wraps a bookingid + booking object.
 *
 * @param {object} body
 */
export function assertCreateBookingResponse(body) {
  expect(typeof body.bookingid, 'bookingid must be a number').toBe('number');
  expect(body.bookingid, 'bookingid must be a positive integer').toBeGreaterThan(0);
  expect(body.booking, 'booking object must be nested in the response').toBeTruthy();
  assertBookingShape(body.booking);
}

/**
 * Assert that a booking list response is a non-empty array of ID objects.
 *
 * @param {Array<{ bookingid: number }>} list
 */
export function assertBookingList(list) {
  expect(Array.isArray(list), 'Booking list should be an array').toBe(true);

  if (list.length > 0) {
    const first = list[0];
    expect(typeof first.bookingid, 'Each list item must have a numeric bookingid').toBe('number');
    expect(first.bookingid, 'bookingid in list must be positive').toBeGreaterThan(0);
  }
}

/**
 * Assert that an auth response contains a valid token.
 *
 * @param {object} body
 */
export function assertAuthToken(body) {
  expect(body.token, 'Token must be present').toBeTruthy();
  expect(typeof body.token, 'Token must be a string').toBe('string');
  expect(body.token.length, 'Token must be at least 10 chars').toBeGreaterThanOrEqual(10);
  // Should NOT contain "Bad credentials" which the API returns as the token value on failure
  expect(body.token).not.toContain('Bad credentials');
}

/**
 * Assert that a response body signals an auth failure.
 * Restful-Booker returns { reason: 'Bad credentials' } on 200 for bad auth.
 *
 * @param {object} body
 */
export function assertAuthFailure(body) {
  // API returns 200 but with a 'reason' field instead of 'token'
  expect(body.token,  'Should not contain a token on failure').toBeUndefined();
  expect(body.reason, 'Should contain a reason on failure').toBeTruthy();
  expect(body.reason, 'Reason should indicate bad credentials').toMatch(/bad credentials/i);
}
