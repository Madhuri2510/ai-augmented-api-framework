/**
 * booking-delete.spec.js — Tests for DELETE /booking/{id}
 *
 * Covers:
 *  Positive: authenticated delete returns 201, booking is gone
 *  Negative: no auth, invalid token, already deleted (idempotency)
 *  Edge: delete then re-fetch, delete non-existent ID
 */

import { test, expect } from '../fixtures/index.js';
import { DataFactory } from '../helpers/DataFactory.js';

test.describe('DELETE /booking/{id} — Delete Booking', () => {

  // ─── Positive ─────────────────────────────────────────────────────────────

  test('DELETE-001 | Authenticated delete returns 201 Created', async ({ apiClient, authToken }) => {
    // Create a fresh booking so we can delete it in this test
    const createRes = await apiClient.createBooking(DataFactory.createBooking());
    const { bookingid } = await createRes.json();

    const deleteRes = await apiClient.deleteBooking(bookingid, authToken);

    // Restful-Booker returns 201 (not 204) on successful deletion
    expect(deleteRes.status(), 'Successful delete should return 201').toBe(201);
  });

  test('DELETE-002 | Deleted booking is no longer retrievable via GET', async ({ apiClient, authToken }) => {
    const createRes = await apiClient.createBooking(DataFactory.createBooking({ firstname: 'ToDelete' }));
    const { bookingid } = await createRes.json();

    await apiClient.deleteBooking(bookingid, authToken);

    const getRes = await apiClient.getBooking(bookingid);
    expect(getRes.status(), 'Deleted booking should return 404 on GET').toBe(404);
  });

  test('DELETE-003 | Deleted booking no longer appears in booking list', async ({ apiClient, authToken }) => {
    const createRes = await apiClient.createBooking(DataFactory.createBooking({ firstname: 'DeleteFromList' }));
    const { bookingid } = await createRes.json();

    await apiClient.deleteBooking(bookingid, authToken);

    const listRes = await apiClient.listBookings();
    const list = await listRes.json();
    const ids = list.map((b) => b.bookingid);

    expect(ids, 'Deleted booking ID should not appear in list').not.toContain(bookingid);
  });

  //  Authentication / Authorisation //

  test('DELETE-004 | Delete without auth token returns 403', async ({ testBooking, request }) => {
    const res = await request.delete(
      `https://restful-booker.herokuapp.com/booking/${testBooking.id}`,
      // No Cookie header
    );
    expect(res.status(), 'Delete without auth should return 403').toBe(403);
  });

  test('DELETE-005 | Delete with invalid token returns 403', async ({ apiClient, testBooking }) => {
    const res = await apiClient.deleteBooking(testBooking.id, 'completelyinvalidtoken');
    expect(res.status(), 'Invalid token should return 403').toBe(403);
  });

  test('DELETE-006 | Delete with empty token string returns 403', async ({ apiClient, testBooking }) => {
    const res = await apiClient.deleteBooking(testBooking.id, '');
    expect(res.status()).toBe(403);
  });

  //  Idempotency / Edge //

  test('DELETE-007 | Deleting a non-existent booking returns 405', async ({ apiClient, authToken }) => {
    const res = await apiClient.deleteBooking(999_999_999, authToken);

    // Restful-Booker returns 405 for missing ID on DELETE
    expect([404, 405], 'Non-existent delete should return 404 or 405').toContain(res.status());
  });

  test('DELETE-008 | Deleting the same booking twice returns non-200 on second attempt', async ({ apiClient, authToken }) => {
    const createRes = await apiClient.createBooking(DataFactory.createBooking());
    const { bookingid } = await createRes.json();

    const firstDelete  = await apiClient.deleteBooking(bookingid, authToken);
    const secondDelete = await apiClient.deleteBooking(bookingid, authToken);

    expect(firstDelete.status(), 'First delete should succeed').toBe(201);
    expect(secondDelete.status(), 'Second delete should not return 201').not.toBe(201);
  });

  test('DELETE-009 | String ID in URL path returns 404 or 405', async ({ apiClient, authToken }) => {
    const res = await apiClient.deleteBooking('not-an-id', authToken);
    expect([404, 405]).toContain(res.status());
  });
});
