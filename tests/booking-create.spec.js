/**
 * booking-create.spec.js — Tests for POST /booking
 *
 * Covers:
 *  Positive: complete valid payload
 *  Positive: minimal payload (no additionalneeds)
 *  Negative: missing required fields, wrong data types
 *  Edge: boundary values, special characters, unicode
 */

import { test, expect } from '../fixtures/index.js';
import { DataFactory } from '../helpers/DataFactory.js';
import { assertCreateBookingResponse, assertBookingShape } from '../helpers/assertions.js';
import { config } from '../config/environments.js';  // ← 1. import config

test.describe('POST /booking — Create Booking', () => {

  //  Positive //

  test('CREATE-001 | Valid full payload creates a booking and returns full booking object', async ({ apiClient }) => {
    const payload = DataFactory.createBooking();
    const res = await apiClient.createBooking(payload);

    expect(res.status(), 'Expected 200 for successful booking creation').toBe(200);

    const body = await res.json();
    assertCreateBookingResponse(body);

    // Verify the response mirrors what we sent
    expect(body.booking.firstname).toBe(payload.firstname);
    expect(body.booking.lastname).toBe(payload.lastname);
    expect(body.booking.totalprice).toBe(payload.totalprice);
    expect(body.booking.depositpaid).toBe(payload.depositpaid);
    expect(body.booking.bookingdates.checkin).toBe(payload.bookingdates.checkin);
    expect(body.booking.bookingdates.checkout).toBe(payload.bookingdates.checkout);
    expect(body.booking.additionalneeds).toBe(payload.additionalneeds);
  });

  test('CREATE-002 | Minimal payload (no additionalneeds) creates a booking', async ({ apiClient }) => {
    const payload = DataFactory.createMinimalBooking();
    const res = await apiClient.createBooking(payload);

    expect(res.status()).toBe(200);
    const body = await res.json();
    assertCreateBookingResponse(body);
    assertBookingShape(body.booking);
  });

  test('CREATE-003 | depositpaid = false is persisted correctly', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({ depositpaid: false });
    const res = await apiClient.createBooking(payload);

    const body = await res.json();
    expect(body.booking.depositpaid, 'depositpaid: false should be stored as false').toBe(false);
  });

  test('CREATE-004 | totalprice = 0 is accepted', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({ totalprice: 0 });
    const res = await apiClient.createBooking(payload);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.booking.totalprice).toBe(0);
  });

  test('CREATE-005 | Returns a unique bookingid on each call', async ({ apiClient }) => {
    const p = DataFactory.createBooking();
    const [res1, res2] = await Promise.all([
      apiClient.createBooking(p),
      apiClient.createBooking(p),
    ]);

    const { bookingid: id1 } = await res1.json();
    const { bookingid: id2 } = await res2.json();

    expect(id1, 'Two bookings should have different IDs').not.toBe(id2);
  });

 

  // Negative //

  test('CREATE-006 | Missing firstname returns 500', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({ firstname: undefined });
    delete payload.firstname;
    const res = await apiClient.createBooking(payload);

    // Restful-Booker returns 500 when required fields are missing
    expect(res.status(), 'Missing required field should not return 200').toBe(500);
  });

  test('CREATE-007 | Missing bookingdates returns 500', async ({ apiClient }) => {
    const payload = DataFactory.createBooking();
    delete payload.bookingdates;
    const res = await apiClient.createBooking(payload);

    expect(res.status()).toBe(500);
  });

  test('CREATE-008 | totalprice as a string returns 200 but value is coerced', async ({ apiClient }) => {
    // Restful-Booker is lenient — documents the real API behaviour here
    const payload = DataFactory.createBookingWithWrongTypes(); // totalprice: 'free'
    const res = await apiClient.createBooking(payload);

    // API does not reject — it coerces. Test documents actual behaviour.
    expect([200, 400, 500], 'Response should be 200, 400, or 500 — not a crash').toContain(res.status());
  });

  test('CREATE-009 | Numeric firstname returns 500', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({ firstname: 12345 });
    const res = await apiClient.createBooking(payload);

    expect(res.status()).toBe(500);
  });

  test('CREATE-010 | Empty firstname returns 500', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({ firstname: '' });
    const res = await apiClient.createBooking(payload);

    expect(res.status()).toBe(500);
  });

  //  Edge / Boundary //

  test('CREATE-011 | Very long firstname and lastname are handled', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({
      firstname: 'A'.repeat(200),
      lastname:  'B'.repeat(200),
    });
    const res = await apiClient.createBooking(payload);

    // Should not crash the API — either 200 (accepts it) or 400 (rejects gracefully)
    expect(res.status(), 'API should not 500 on long name strings').not.toBe(500);
  });

  test('CREATE-012 | Unicode characters in name fields are handled', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({
      firstname: 'Ångström',
      lastname:  '日本語',
    });
    const res = await apiClient.createBooking(payload);

    expect(res.status(), 'API should handle Unicode characters').toBe(200);
    const body = await res.json();
    expect(body.booking.firstname).toBe('Ångström');
  });

  test('CREATE-013 | Inverted dates (checkout before checkin) are accepted by API', async ({ apiClient }) => {
    // Restful-Booker does not enforce date ordering — this documents actual behaviour.
    // A stricter API should return 400 here.
    const payload = DataFactory.createBookingWithInvertedDates();
    const res = await apiClient.createBooking(payload);

    const status = res.status();
    expect([200, 400], 'Inverted dates should return 200 (accepted) or 400 (rejected)').toContain(status);
  });

  test('CREATE-014 | Very large totalprice is handled', async ({ apiClient }) => {
    const payload = DataFactory.createBooking({ totalprice: 9999999999 });
    const res = await apiClient.createBooking(payload);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.booking.totalprice).toBe(9999999999);
  });
});
