/**
 * Environment and API configuration
 * All environment-specific values live here — tests import from this file,
 * never from process.env directly.
 */

export const config = {
  baseURL: process.env.BASE_URL || 'https://restful-booker.herokuapp.com',

  auth: {
    username: process.env.BOOKER_USERNAME || 'admin',
    password: process.env.BOOKER_PASSWORD || 'password123',
  },

  endpoints: {
    auth:    '/auth',
    booking: '/booking',
    health:  '/ping',
  },

  // Anthropic API key for AI agents 
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // How long to wait between write operations to be respectful of the public API
  throttleMs: 200,
};