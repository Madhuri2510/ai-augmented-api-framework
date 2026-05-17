/**
 * booking-read.spec.js — Tests for GET /booking and GET /booking/{id}
 *
 * Covers:
 *  Positive: list all bookings, get by ID, filter by name/date
 *  Negative: non-existent ID, wrong types, malformed params
 *  Edge: booking created then immediately fetched, filter with no matches
 */

import { test, expect } from '../fixtures/index.js';
import { assertBookingList, assertBookingShape } from '../helpers/assertions.js';
import { config } from '../config/environments.js';  // ← 1. import config

test.describe('GET /booking — List All Bookings', () => {

  test('READ-001 | Returns an array of booking ID objects', async ({ apiClient }) => {
    const res = await apiClient.listBookings();

    expect(res.status(), 'List endpoint should return 200').toBe(200);

    const body = await res.json();
    assertBookingList(body);
  });

  test('READ-002 | Content-Type is application/json', async ({ apiClient }) => {
    const res = await apiClient.listBookings();
    expect(res.headers()['content-type']).toContain('application/json');
  });

  test('READ-003 | Filter by firstname returns only matching bookings', async ({ apiClient, testBooking }) => {
    const res = await apiClient.listBookings({ firstname: testBooking.data.firstname });

    expect(res.status()).toBe(200);
    const list = await res.json();

    expect(Array.isArray(list)).toBe(true);
    // The booking we just created must appear in the filtered results
    const ids = list.map((b) => b.bookingid);
    expect(ids, 'Created booking should appear in filtered list').toContain(testBooking.id);
  });

  test('READ-004 | Filter by checkin date returns matching bookings', async ({ apiClient, testBooking }) => {
    const res = await apiClient.listBookings({
      checkin: testBooking.data.bookingdates.checkin,
    });

    expect(res.status()).toBe(200);
    const list = await res.json();
    assertBookingList(list);
  });

  test('READ-005 | Filter with no matches returns an empty array', async ({ apiClient }) => {
    const res = await apiClient.listBookings({ firstname: 'ZZZNOMATCHZZZ_' + Date.now() });

    expect(res.status()).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length, 'Unmatched filter should return empty array').toBe(0);
  });
});

test.describe('GET /booking/{id} — Get Single Booking', () => {

  test('READ-006 | Valid ID returns the full booking object', async ({ apiClient, testBooking }) => {
    const res = await apiClient.getBooking(testBooking.id);

    expect(res.status(), 'Valid ID should return 200').toBe(200);

    const body = await res.json();
    assertBookingShape(body, {
      firstname:   testBooking.data.firstname,
      lastname:    testBooking.data.lastname,
      totalprice:  testBooking.data.totalprice,
      depositpaid: testBooking.data.depositpaid,
    });
  });

  test('READ-007 | Response includes all expected fields', async ({ apiClient, testBooking }) => {
    const res = await apiClient.getBooking(testBooking.id);
    const body = await res.json();

    // Verify no surprise missing fields
    expect(Object.keys(body)).toEqual(
      expect.arrayContaining([
        'firstname', 'lastname', 'totalprice', 'depositpaid', 'bookingdates',
      ])
    );
  });

  test('READ-008 | Non-existent ID returns 404', async ({ apiClient }) => {
    const res = await apiClient.getBooking(999_999_999);

    expect(res.status(), 'Non-existent ID should return 404').toBe(404);
  });

  test('READ-009 | Negative ID returns 404', async ({ apiClient }) => {
    const res = await apiClient.getBooking(-1);

    expect([404, 400], 'Negative ID should return 404 or 400').toContain(res.status());
  });

  test('READ-010 | String instead of numeric ID returns 404', async ({ apiClient }) => {
    const res = await apiClient.getBooking('not-a-number');

    expect([404, 400], 'Non-numeric ID should return 404 or 400').toContain(res.status());
  });

  test('READ-011 | Newly created booking is immediately retrievable', async ({ apiClient }) => {
    const { DataFactory } = await import('../helpers/DataFactory.js');
    const payload = DataFactory.createBooking({ firstname: 'ImmediateRead' });

    const createRes = await apiClient.createBooking(payload);
    const { bookingid } = await createRes.json();

    const getRes = await apiClient.getBooking(bookingid);

    expect(getRes.status(), 'Newly created booking should be immediately readable').toBe(200);
    const body = await getRes.json();
    expect(body.firstname).toBe('ImmediateRead');
  });

  test('READ-012 | Booking data is consistent between list and get', async ({ apiClient, testBooking }) => {
    // Verify the booking appears in the list with the same ID
    const listRes = await apiClient.listBookings();
    const list = await listRes.json();
    const ids = list.map((b) => b.bookingid);

    expect(ids).toContain(testBooking.id);

    // And that fetching it by ID gives the same data the fixture created
    const getRes = await apiClient.getBooking(testBooking.id);
    const body = await getRes.json();
    expect(body.firstname).toBe(testBooking.data.firstname);
    expect(body.totalprice).toBe(testBooking.data.totalprice);
  });
});
