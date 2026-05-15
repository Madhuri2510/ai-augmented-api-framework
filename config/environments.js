/**
 * environments.js — central config loader.
 *
 * Resolution order:
 *  1. Read ENV variable (e.g. ENV=uat from the npm script)
 *  2. Load config/env/{env}.env via dotenv
 *  3. Any value already set in the shell takes precedence (dotenv's default)
 *
 * Usage in npm scripts:
 *   npm run test:dev   →  ENV=dev
 *   npm run test:uat   →  ENV=uat
 *   npm run test:prod  →  ENV=prod
 *   npm test           →  falls back to dev
 */

import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);
const dotenv    = require('dotenv');

// Determine active environment //
const ENV = process.env.ENV || 'dev';
const validEnvs = ['dev', 'uat', 'prod'];

if (!validEnvs.includes(ENV)) {
  throw new Error(
    `[environments.js] Unknown ENV="${ENV}". Valid values: ${validEnvs.join(', ')}`
  );
}

//  Load the matching .env file //
// dotenv.config does NOT overwrite variables already set in the shell,
// which means CI secrets (set via GitHub Secrets) always win.
const envFilePath = resolve(__dirname, 'env', `${ENV}.env`);
const result = dotenv.config({ path: envFilePath });

if (result.error) {
  throw new Error(
    `[environments.js] Could not load env file at "${envFilePath}": ${result.error.message}`
  );
}

console.log(`\n Environment: ${ENV.toUpperCase()}  (loaded from config/env/${ENV}.env)\n`);

//  Export resolved config //
export const config = {
  env: ENV,

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

  // OpenAI API key for AI agents (optional — tests run fine without it)
  openaiApiKey:  process.env.OPENAI_API_KEY  || '',
  openaiModel:   process.env.OPENAI_MODEL    || 'gpt-4o',

  // How long to wait between write operations (ms)
  throttleMs: Number(process.env.THROTTLE_MS) || 200,
};
