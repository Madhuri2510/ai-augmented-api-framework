/**
 * security.spec.js — Security and API hygiene tests
 *
 * These aren't about functional correctness — they're about ensuring the API
 * doesn't expose dangerous behaviours that attackers could exploit.
 *
 * Covers:
 *  Auth bypass attempts
 *  Injection payload handling (SQL, XSS, path traversal)
 *  Header and transport security signals
 *  Rate-limiting awareness
 */

import { test, expect } from '../fixtures/index.js';
import { DataFactory } from '../helpers/dataFactory.js';

test.describe('Security & API Hygiene', () => {

  // Authentication Bypass //

  test('SEC-001 | PUT without any auth header is rejected with 403', async ({ testBooking, request }) => {
    const res = await request.put(
      `https://restful-booker.herokuapp.com/booking/${testBooking.id}`,
      { data: DataFactory.createFullUpdate() },
    );
    expect(res.status()).toBe(403);
  });

  test('SEC-002 | DELETE without any auth header is rejected with 403', async ({ testBooking, request }) => {
    const res = await request.delete(
      `https://restful-booker.herokuapp.com/booking/${testBooking.id}`,
    );
    expect(res.status()).toBe(403);
  });

  test('SEC-003 | Forged token (same length as real) is rejected', async ({ apiClient, authToken, testBooking }) => {
    // Create a token of the same length but scrambled to look plausible
    const scrambled = authToken.split('').reverse().join('');
    const res = await apiClient.deleteBooking(testBooking.id, scrambled);

    expect(res.status(), 'Scrambled token should not grant access').toBe(403);
  });

  test('SEC-004 | Auth endpoint does not return sensitive server details on failure', async ({ apiClient }) => {
    const res = await apiClient.authenticate({ username: 'hacker', password: 'hack' });
    const body = await res.json();

    // Error responses should not leak stack traces, DB errors, internal paths, etc.
    const bodyStr = JSON.stringify(body).toLowerCase();
    expect(bodyStr, 'Error body should not contain SQL keywords').not.toMatch(/select|insert|update|delete from/i);
    expect(bodyStr, 'Error body should not contain file paths').not.toMatch(/[a-z]:\\|\/etc\/|\/var\//i);
  });

  //  Injection Resistance //

  test('SEC-005 | SQL injection in firstname does not crash the API', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({ firstname: "Robert'); DROP TABLE bookings;--" });
    const res = await apiClient.createBooking(payload);

    expect(res.status(), 'API should not 500 on SQL injection in name').not.toBe(500);
  });

  test('SEC-006 | XSS payload in additionalneeds is stored as plain text', async ({ apiClient }) => {
    const xss = '<script>alert("xss")</script>';
    const payload = DataFactory.createBooking({ additionalneeds: xss });
    const res = await apiClient.createBooking(payload);

    if (res.status() === 200) {
      const body = await res.json();
      // Should be returned as-is (not executed) — this is an API, not a browser,
      // but verifying round-trip integrity is still useful
      expect(body.booking.additionalneeds).toBe(xss);
    } else {
      // Rejecting it is also acceptable
      expect([400, 422]).toContain(res.status());
    }
  });

  test('SEC-007 | Path traversal in booking ID is rejected', async ({ apiClient }) => {
    const res = await apiClient.getBooking('../etc/passwd');
    expect([400, 404]).toContain(res.status());
  });

  test('SEC-008 | Null byte in string field does not cause a 500', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({ firstname: 'Test\u0000Null' });
    const res = await apiClient.createBooking(payload);

    expect(res.status(), 'Null byte should not cause unhandled 500').not.toBe(500);
  });

  //  Transport & Header Checks  //

  test('SEC-009 | API responds over HTTPS (implicit — base URL uses https)', async ({ apiClient }) => {
    // If the API responded at all, the HTTPS connection succeeded.
    const res = await apiClient.ping();
    expect(res.status()).toBe(201);
  });

  test('SEC-010 | Content-Type header is present on all responses', async ({ apiClient, testBooking }) => {
    const res = await apiClient.getBooking(testBooking.id);
    const ct = res.headers()['content-type'];
    expect(ct, 'Content-Type header should always be set').toBeTruthy();
  });

  //  Mass Assignment  //

  test('SEC-011 | Extra unknown fields in POST body are ignored, not stored', async ({ apiClient }) => {
    const payload = DataFactory.createBooking();
    // Attempt mass-assignment of an internal field
    payload.__proto__ = { admin: true };
    payload['internalId'] = 'override-me';
    payload['role'] = 'superadmin';

    const res = await apiClient.createBooking(payload);
    expect(res.status()).toBe(200);

    const body = await res.json();
    // None of the injected fields should be in the response
    expect(body.booking['role'],       'role field should not be returned').toBeUndefined();
    expect(body.booking['internalId'], 'internalId field should not be returned').toBeUndefined();
  });
});
