/**
 * auth.spec.js — Tests for POST /auth
 *
 * Covers:
 *  Positive: valid credentials return a token
 *  Negative: wrong password, wrong username, missing fields
 *  Edge: empty strings, extra fields, malformed body
 */

import { test, expect } from '../fixtures/index.js';
import { assertAuthToken, assertAuthFailure } from '../helpers/assertions.js';

test.describe('POST /auth — Authentication', () => {

  // Positive //

  test('AUTH-001 | Valid credentials return a token', async ({ apiClient }) => {
    const res = await apiClient.authenticate();

    expect(res.status(), 'Expected 200 OK for valid credentials').toBe(200);

    const body = await res.json();
    assertAuthToken(body);
  });

  test('AUTH-002 | Content-Type is application/json', async ({ apiClient }) => {
    const res = await apiClient.authenticate();
    const contentType = res.headers()['content-type'] ?? '';

    expect(contentType, 'Response Content-Type should be JSON').toContain('application/json');
  });

  test('AUTH-003 | Token is stable within the same session', async ({ apiClient }) => {
    const res1 = await apiClient.authenticate();
    const res2 = await apiClient.authenticate();

    const { token: token1 } = await res1.json();
    const { token: token2 } = await res2.json();

    // Restful-Booker returns the same token for the same credentials
    expect(token1).toBe(token2);
  });

  //  Negative //

  test('AUTH-004 | Wrong password returns bad credentials', async ({ apiClient }) => {
    const res = await apiClient.authenticate({ password: 'wrongpassword' });

    // API returns 200 but with a reason field instead of a token
    expect(res.status()).toBe(200);
    const body = await res.json();
    assertAuthFailure(body);
  });

  test('AUTH-005 | Wrong username returns bad credentials', async ({ apiClient }) => {
    const res = await apiClient.authenticate({ username: 'notauser' });

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertAuthFailure(body);
  });

  test('AUTH-006 | Empty password returns bad credentials', async ({ apiClient }) => {
    const res = await apiClient.authenticate({ password: '' });

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertAuthFailure(body);
  });

  test('AUTH-007 | Empty username returns bad credentials', async ({ apiClient }) => {
    const res = await apiClient.authenticate({ username: '' });

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertAuthFailure(body);
  });

  test('AUTH-008 | Missing password field returns bad credentials', async ({ request }) => {
    const res = await request.post('https://restful-booker.herokuapp.com/auth', {
      data: { username: 'admin' }, // no password key at all
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertAuthFailure(body);
  });

  test('AUTH-009 | Missing username field returns bad credentials', async ({ request }) => {
    const res = await request.post('https://restful-booker.herokuapp.com/auth', {
      data: { password: 'password123' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertAuthFailure(body);
  });

  //  Edge Cases //

  test('AUTH-010 | SQL injection string in password does not break the API', async ({ apiClient }) => {
    const res = await apiClient.authenticate({ password: "' OR '1'='1" });

    // Should respond normally (bad credentials), NOT 500
    expect(res.status(), 'API should not crash on SQL injection attempt').not.toBe(500);
    const body = await res.json();
    assertAuthFailure(body);
  });

  test('AUTH-011 | Very long password string handled gracefully', async ({ apiClient }) => {
    const res = await apiClient.authenticate({ password: 'x'.repeat(1000) });

    expect(res.status(), 'API should not crash on long password').not.toBe(500);
    const body = await res.json();
    // Should either say bad credentials or error — never 500 unhandled
    expect(body).toBeTruthy();
  });

  test('AUTH-012 | Empty body returns 200 with bad credentials', async ({ request }) => {
    const res = await request.post('https://restful-booker.herokuapp.com/auth', {
      data: {},
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    assertAuthFailure(body);
  });
});
