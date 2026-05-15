/**
 * DataFactory — generates realistic, deterministic test data for bookings.
 *
 * Using a factory keeps test data consistent, readable, and easy to override
 * for edge-case scenarios without polluting test files with raw objects.
 */

export class DataFactory {
  /**
   * Creates a valid, complete booking payload.
   * Optional overrides let individual tests customise specific fields.
   *
   * @param {Partial<BookingPayload>} overrides
   * @returns {BookingPayload}
   */
  static createBooking(overrides = {}) {
    return {
      firstname: 'James',
      lastname:  'Brown',
      totalprice: 150,
      depositpaid: true,
      bookingdates: {
        checkin:  '2025-06-01',
        checkout: '2025-06-07',
      },
      additionalneeds: 'Breakfast',
      ...overrides,
    };
  }

  /** A booking where checkout is before checkin — business-logic edge case */
  static createBookingWithInvertedDates() {
    return this.createBooking({
      bookingdates: { checkin: '2025-06-10', checkout: '2025-06-01' },
    });
  }

  /** A booking with only the required fields (no additionalneeds) */
  static createMinimalBooking() {
    return {
      firstname: 'Jane',
      lastname:  'Doe',
      totalprice: 100,
      depositpaid: false,
      bookingdates: { checkin: '2025-07-01', checkout: '2025-07-03' },
    };
  }

  /** A booking with extreme but plausible values */
  static createBoundaryBooking() {
    return this.createBooking({
      firstname: 'A',                        // single character
      lastname:  'B'.repeat(50),             // very long name
      totalprice: 0,                         // zero price
      additionalneeds: 'x'.repeat(500),      // large text field
    });
  }

  /** Booking payload with a string where a number is expected */
  static createBookingWithWrongTypes() {
    return this.createBooking({ totalprice: 'free' });
  }

  /** Valid partial update payload (for PATCH) */
  static createPartialUpdate(overrides = {}) {
    return {
      firstname: 'UpdatedFirstName',
      lastname:  'UpdatedLastName',
      ...overrides,
    };
  }

  /** Full update payload (for PUT) */
  static createFullUpdate(overrides = {}) {
    return this.createBooking({
      firstname: 'Updated',
      lastname:  'Person',
      totalprice: 999,
      depositpaid: false,
      bookingdates: { checkin: '2025-09-01', checkout: '2025-09-05' },
      additionalneeds: 'Dinner',
      ...overrides,
    });
  }
}

/**
 * @typedef {Object} BookingPayload
 * @property {string} firstname
 * @property {string} lastname
 * @property {number} totalprice
 * @property {boolean} depositpaid
 * @property {{ checkin: string, checkout: string }} bookingdates
 * @property {string} [additionalneeds]
 */
