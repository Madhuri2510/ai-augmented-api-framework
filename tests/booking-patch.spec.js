/**
 * booking-patch.spec.js — Tests for PATCH /booking/{id}  (partial update)
 *
 * Key distinction from PUT: PATCH only changes the fields you send.
 * Untouched fields must remain unchanged.
 *
 * Covers:
 *  Positive: partial update preserves untouched fields
 *  Negative: no auth, invalid token, non-existent ID
 *  Edge: PATCH with empty object, PATCH a single field
 */

import { test, expect } from '../fixtures/index.js';
import { DataFactory } from '../helpers/DataFactory.js';
import { assertBookingShape } from '../helpers/assertions.js';

test.describe('PATCH /booking/{id} — Partial Update', () => {

  // Positive //

  test('PATCH-001 | Can update firstname only — other fields unchanged', async ({ apiClient, authToken, testBooking }) => {
    const originalLastname   = testBooking.data.lastname;
    const originalTotalprice = testBooking.data.totalprice;

    const res = await apiClient.patchBooking(
      testBooking.id,
      { firstname: 'PatchedFirst' },
      authToken,
    );

    expect(res.status(), 'PATCH with valid auth should return 200').toBe(200);
    const body = await res.json();

    expect(body.firstname, 'Patched field should be updated').toBe('PatchedFirst');
    expect(body.lastname,    'Untouched field (lastname) should be unchanged').toBe(originalLastname);
    expect(body.totalprice,  'Untouched field (totalprice) should be unchanged').toBe(originalTotalprice);
  });

  test('PATCH-002 | Can update lastname only', async ({ apiClient, authToken, testBooking }) => {
    const res = await apiClient.patchBooking(
      testBooking.id,
      { lastname: 'PatchedLast' },
      authToken,
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.lastname).toBe('PatchedLast');
    // firstname should not have changed
    expect(body.firstname).toBe(testBooking.data.firstname);
  });

  test('PATCH-003 | Can update totalprice only', async ({ apiClient, authToken, testBooking }) => {
    const res = await apiClient.patchBooking(testBooking.id, { totalprice: 777 }, authToken);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.totalprice).toBe(777);
    expect(body.firstname).toBe(testBooking.data.firstname); // unchanged
  });

  test('PATCH-004 | Can update bookingdates partially', async ({ apiClient, authToken, testBooking }) => {
    const newDates = { bookingdates: { checkin: '2025-10-01', checkout: '2025-10-07' } };
    const res = await apiClient.patchBooking(testBooking.id, newDates, authToken);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.bookingdates.checkin).toBe('2025-10-01');
    expect(body.bookingdates.checkout).toBe('2025-10-07');
  });

  test('PATCH-005 | Multiple fields can be updated in one PATCH', async ({ apiClient, authToken, testBooking }) => {
    const partial = { firstname: 'MultiFirst', lastname: 'MultiLast', totalprice: 500 };
    const res = await apiClient.patchBooking(testBooking.id, partial, authToken);

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.firstname).toBe('MultiFirst');
    expect(body.lastname).toBe('MultiLast');
    expect(body.totalprice).toBe(500);
  });

  test('PATCH-006 | Response body is a valid booking object', async ({ apiClient, authToken, testBooking }) => {
    const res = await apiClient.patchBooking(testBooking.id, { firstname: 'ShapeCheck' }, authToken);
    const body = await res.json();
    assertBookingShape(body);
  });

  test('PATCH-007 | Patched data is persisted via subsequent GET', async ({ apiClient, authToken, testBooking }) => {
    await apiClient.patchBooking(testBooking.id, { lastname: 'PersistedPatch' }, authToken);

    const getRes = await apiClient.getBooking(testBooking.id);
    const body = await getRes.json();

    expect(body.lastname, 'Patch should persist in GET response').toBe('PersistedPatch');
  });

  //  Authentication / Authorisation //

  test('PATCH-008 | Request without auth returns 403', async ({ testBooking, request }) => {
    const res = await request.patch(
      `https://restful-booker.herokuapp.com/booking/${testBooking.id}`,
      { data: { firstname: 'NoAuth' } },
    );
    expect(res.status(), 'Unauthenticated PATCH should return 403').toBe(403);
  });

  test('PATCH-009 | Invalid token returns 403', async ({ apiClient, testBooking }) => {
    const res = await apiClient.patchBooking(testBooking.id, { firstname: 'BadToken' }, 'garbage');
    expect(res.status()).toBe(403);
  });

  //  Negative //

  test('PATCH-010 | Non-existent booking ID returns 405 or 404', async ({ apiClient, authToken }) => {
    const res = await apiClient.patchBooking(999_999_999, { firstname: 'Ghost' }, authToken);
    expect([404, 405]).toContain(res.status());
  });

  //  Edge //

  test('PATCH-011 | PATCH with empty object — no fields should change', async ({ apiClient, authToken, testBooking }) => {
    const res = await apiClient.patchBooking(testBooking.id, {}, authToken);

    // API may accept or reject — document real behaviour
    const status = res.status();
    expect([200, 400]).toContain(status);

    if (status === 200) {
      const body = await res.json();
      // Original fields should be unchanged
      expect(body.firstname).toBe(testBooking.data.firstname);
    }
  });
});
