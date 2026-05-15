/**
 * booking-update.spec.js — Tests for PUT /booking/{id}  (full update)
 *
 * Covers:
 *  Positive: authenticated full update, all fields changed
 *  Negative: no auth, wrong token, non-existent ID, missing fields
 *  Edge: update with same data, update then re-fetch
 */

import { test, expect } from '../fixtures/index.js';
import { DataFactory } from '../helpers/DataFactory.js';
import { assertBookingShape } from '../helpers/assertions.js';

test.describe('PUT /booking/{id} — Full Update', () => {

  //  Positive //

  test('UPDATE-001 | Authenticated full update returns updated booking', async ({ apiClient, authToken, testBooking }) => {
    const updatedPayload = DataFactory.createFullUpdate();
    const res = await apiClient.updateBooking(testBooking.id, updatedPayload, authToken);

    expect(res.status(), 'Authenticated PUT should return 200').toBe(200);

    const body = await res.json();
    assertBookingShape(body, {
      firstname:   updatedPayload.firstname,
      lastname:    updatedPayload.lastname,
      totalprice:  updatedPayload.totalprice,
      depositpaid: updatedPayload.depositpaid,
    });
  });

  test('UPDATE-002 | Updated data is persisted and retrievable via GET', async ({ apiClient, authToken, testBooking }) => {
    const updatedPayload = DataFactory.createFullUpdate({ firstname: 'PersistenceCheck' });

    await apiClient.updateBooking(testBooking.id, updatedPayload, authToken);

    // Re-fetch and verify
    const getRes = await apiClient.getBooking(testBooking.id);
    const body = await getRes.json();

    expect(body.firstname, 'Updated firstname should be persisted').toBe('PersistenceCheck');
    expect(body.totalprice, 'Updated totalprice should be persisted').toBe(updatedPayload.totalprice);
  });

  test('UPDATE-003 | Can update totalprice to 0', async ({ apiClient, authToken, testBooking }) => {
    const payload = DataFactory.createFullUpdate({ totalprice: 0 });
    const res = await apiClient.updateBooking(testBooking.id, payload, authToken);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.totalprice).toBe(0);
  });

  test('UPDATE-004 | Can flip depositpaid from true to false', async ({ apiClient, authToken, testBooking }) => {
    const payload = DataFactory.createFullUpdate({ depositpaid: false });
    const res = await apiClient.updateBooking(testBooking.id, payload, authToken);

    const body = await res.json();
    expect(body.depositpaid).toBe(false);
  });

  //  Authentication / Authorisation //

  test('UPDATE-005 | Request without auth token returns 403', async ({ apiClient, testBooking, request }) => {
    const payload = DataFactory.createFullUpdate();

    const res = await request.put(
      `https://restful-booker.herokuapp.com/booking/${testBooking.id}`,
      { data: payload }, // no auth header
    );

    expect(res.status(), 'Missing auth should return 403').toBe(403);
  });

  test('UPDATE-006 | Invalid token returns 403', async ({ apiClient, testBooking }) => {
    const payload = DataFactory.createFullUpdate();
    const res = await apiClient.updateBooking(testBooking.id, payload, 'invalidtoken123');

    expect(res.status(), 'Invalid token should return 403').toBe(403);
  });

  test('UPDATE-007 | Expired / malformed token returns 403', async ({ apiClient, testBooking }) => {
    const payload = DataFactory.createFullUpdate();
    const res = await apiClient.updateBooking(testBooking.id, payload, '!@#$%^&*()');

    expect(res.status()).toBe(403);
  });

  //  Negative  //

  test('UPDATE-008 | Non-existent booking ID returns 405 or 404', async ({ apiClient, authToken }) => {
    const payload = DataFactory.createFullUpdate();
    const res = await apiClient.updateBooking(999_999_999, payload, authToken);

    // Restful-Booker returns 405 for non-existent ID on PUT
    expect([404, 405], 'Non-existent ID should return 404 or 405').toContain(res.status());
  });

  test('UPDATE-009 | Missing firstname in body returns 400', async ({ apiClient, authToken, testBooking }) => {
    const payload = DataFactory.createFullUpdate();
    delete payload.firstname;

    const res = await apiClient.updateBooking(testBooking.id, payload, authToken);

    expect([400, 500], 'Missing required field should not return 200').toContain(res.status());
  });

  test('UPDATE-010 | Updating with same data returns the same booking', async ({ apiClient, authToken, testBooking }) => {
    // PUT is idempotent — sending the same data twice should produce the same result
    const payload = DataFactory.createFullUpdate();

    const res1 = await apiClient.updateBooking(testBooking.id, payload, authToken);
    const res2 = await apiClient.updateBooking(testBooking.id, payload, authToken);

    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(res1.status()).toBe(200);
    expect(res2.status()).toBe(200);
    expect(body1.firstname).toBe(body2.firstname);
    expect(body1.totalprice).toBe(body2.totalprice);
  });
});
