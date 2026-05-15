/**
 * ApiClient — thin wrapper around Playwright's APIRequestContext.
 *
 * Responsibilities:
 *  - Centralise all HTTP calls so test files stay declarative
 *  - Handle auth header injection
 *  - Provide typed methods for each endpoint
 *
 * Tests should use this class rather than calling `request.*` directly.
 */

import { config } from '../config/environments.js';

export class ApiClient {
  /**
   * @param {import('@playwright/test').APIRequestContext} request
   */
  constructor(request) {
    this.request = request;
    this.baseURL = config.baseURL;
  }
 
  // Authentication //
 
  /**
   * POST /auth
   * Returns the raw Playwright response so callers can assert status, body, etc.
   */
  async authenticate(credentials = {}) {
    const body = {
      username: config.auth.username,
      password: config.auth.password,
      ...credentials,
    };
    return this.request.post(`${this.baseURL}/auth`, { data: body });
  }

  /**
   * Convenience: authenticate and return just the token string.
   * Throws if authentication fails.
   */
  async getAuthToken() {
    const res = await this.authenticate();
    if (!res.ok()) {
      throw new Error(`Failed to obtain auth token: ${res.status()} ${res.statusText()}`);
    }
    const body = await res.json();
    if (!body.token) {
      throw new Error(`Auth response did not contain a token: ${JSON.stringify(body)}`);
    }
    return body.token;
  }

  // Bookings (read) //

  /** GET /booking — list all booking IDs, optionally filter by query params */
  async listBookings(params = {}) {
    return this.request.get(`${this.baseURL}/booking`, { params });
  }

  /** GET /booking/{id} */
  async getBooking(id) {
    return this.request.get(`${this.baseURL}/booking/${id}`);
  }

  // Bookings (write — requires token) //

  /** POST /booking */
  async createBooking(bookingData) {
    return this.request.post(`${this.baseURL}/booking`, { data: bookingData });
  }

  /** PUT /booking/{id} */
  async updateBooking(id, bookingData, token) {
    return this.request.put(`${this.baseURL}/booking/${id}`, {
      data: bookingData,
      headers: this._authHeaders(token),
    });
  }

  /** PATCH /booking/{id} */
  async patchBooking(id, partial, token) {
    return this.request.patch(`${this.baseURL}/booking/${id}`, {
      data: partial,
      headers: this._authHeaders(token),
    });
  }

  /** DELETE /booking/{id} */
  async deleteBooking(id, token) {
    return this.request.delete(`${this.baseURL}/booking/${id}`, {
      headers: this._authHeaders(token),
    });
  }

  //  Health //

  /** GET /ping */
  async ping() {
    return this.request.get(`${this.baseURL}/ping`);
  }

  // Private helpers //

  /**
   * Build Cookie auth header expected by Restful-Booker.
   * The API accepts both Cookie and Basic auth — Cookie is the primary one.
   */
  _authHeaders(token) {
    if (!token) throw new Error('Auth token is required for this operation');
    return { Cookie: `token=${token}` };
  }
}
