#!/usr/bin/env node
/**
 * scripts/generate-tests.js
 *
 * AI-powered test case generator.
 *
 * Uses the TestGeneratorAgent to analyse each Restful-Booker endpoint and
 * generate a structured set of test cases.  Results are printed to stdout
 * and written to reports/ai-generated-test-cases.json.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-ant-... node scripts/generate-tests.js
 *
 * If OPENAI_API_KEY is not set, the script exits with a helpful message.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

import { TestGeneratorAgent } from '../agents/TestGeneratorAgent.js';

//  API spec for Restful-Booker //
// Each entry describes one endpoint so the agent has all the context it needs.

const API_SPEC = [
  {
    method: 'POST',
    path: '/auth',
    description: 'Generates an authentication token given valid admin credentials.',
    requiresAuth: false,
    requestSchema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', example: 'admin' },
        password: { type: 'string', example: 'password123' },
      },
    },
    responseSchema: {
      success: { token: 'string (15+ chars)' },
      failure: { reason: 'Bad credentials' },
    },
  },
  {
    method: 'GET',
    path: '/booking',
    description: 'Returns a list of all booking IDs. Supports optional query-param filtering by firstname, lastname, checkin, checkout.',
    requiresAuth: false,
    queryParams: ['firstname', 'lastname', 'checkin', 'checkout'],
    responseSchema: {
      type: 'array',
      items: { bookingid: 'number' },
    },
  },
  {
    method: 'GET',
    path: '/booking/{id}',
    description: 'Returns the full booking object for a given ID.',
    requiresAuth: false,
    pathParams: ['id'],
    responseSchema: {
      firstname:       'string',
      lastname:        'string',
      totalprice:      'number',
      depositpaid:     'boolean',
      bookingdates:    { checkin: 'YYYY-MM-DD', checkout: 'YYYY-MM-DD' },
      additionalneeds: 'string (optional)',
    },
  },
  {
    method: 'POST',
    path: '/booking',
    description: 'Creates a new booking. No authentication required.',
    requiresAuth: false,
    requestSchema: {
      type: 'object',
      required: ['firstname', 'lastname', 'totalprice', 'depositpaid', 'bookingdates'],
      properties: {
        firstname:       { type: 'string' },
        lastname:        { type: 'string' },
        totalprice:      { type: 'number', minimum: 0 },
        depositpaid:     { type: 'boolean' },
        bookingdates:    { checkin: 'YYYY-MM-DD', checkout: 'YYYY-MM-DD' },
        additionalneeds: { type: 'string', optional: true },
      },
    },
    responseSchema: {
      bookingid: 'number',
      booking:   '{ ...booking object }',
    },
  },
  {
    method: 'PUT',
    path: '/booking/{id}',
    description: 'Full replacement of a booking. Requires cookie auth token.',
    requiresAuth: true,
    authMechanism: 'Cookie: token=<value>',
    pathParams: ['id'],
    requestSchema: {
      type: 'object',
      required: ['firstname', 'lastname', 'totalprice', 'depositpaid', 'bookingdates'],
    },
    responseSchema: '{ ...updated booking object }',
  },
  {
    method: 'PATCH',
    path: '/booking/{id}',
    description: 'Partial update of a booking — only the provided fields are changed. Requires cookie auth token.',
    requiresAuth: true,
    authMechanism: 'Cookie: token=<value>',
    pathParams: ['id'],
    requestSchema: { type: 'object', note: 'Any subset of booking fields' },
    responseSchema: '{ ...full booking object with applied changes }',
  },
  {
    method: 'DELETE',
    path: '/booking/{id}',
    description: 'Deletes a booking by ID. Requires cookie auth token. Returns 201 on success.',
    requiresAuth: true,
    authMechanism: 'Cookie: token=<value>',
    pathParams: ['id'],
    responseSchema: { status: 201, body: 'Created' },
  },
];

//  Main //

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      '\n  OPENAI_API_KEY is not set.\n' +
      '   Set it in .env or export it before running this script:\n' +
      '   export OPENAI_API_KEY=sk-ant-...\n'
    );
    process.exit(1);
  }

  console.log('\nTestGeneratorAgent — Analysing Restful-Booker API\n');
  console.log(`   Endpoints to analyse: ${API_SPEC.length}`);
  console.log('   Generating test cases with Claude...\n');

  const agent   = new TestGeneratorAgent();
  const results = await agent.generateForApi(API_SPEC);

  //  Output //

  const outDir  = resolve(__dirname, '../reports');
  const outFile = resolve(outDir, 'ai-generated-test-cases.json');

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(results, null, 2));

  // Summary //
  let total = 0;
  for (const [endpoint, cases] of Object.entries(results)) {
    const count = cases?.length ?? 0;
    total += count;
    console.log(`  ${endpoint}: ${count} test cases`);
  }

  console.log(`\n Total: ${total} test cases generated`);
  console.log(`Saved to: ${outFile}\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
