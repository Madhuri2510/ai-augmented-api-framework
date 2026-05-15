/**
 * TestGeneratorAgent — AI agent that analyses a microservice API spec and
 * generates a comprehensive set of positive, negative, and edge-case test
 * scenarios.
 *
 * This agent is the heart of the "AI-powered" approach:
 *  1. You give it an API endpoint spec (method, path, description, schema).
 *  2. It reasons about the contract and returns structured test cases.
 *  3. Those test cases can be used to drive automated Playwright tests
 *     or exported as a test strategy document.
 *
 * Usage (standalone script):
 *   const agent = new TestGeneratorAgent();
 *   const cases = await agent.generateForEndpoint({
 *     method: 'POST',
 *     path: '/booking',
 *     description: 'Creates a new booking',
 *     requestSchema: { ... },
 *     responseSchema: { ... },
 *   });
 */

import { BaseAgent } from './BaseAgent.js';

const SYSTEM_PROMPT = `
You are a senior QA engineer specialising in REST API testing.
Given an API endpoint specification, you generate a comprehensive,
well-reasoned set of test cases covering:

  1. Positive / happy-path scenarios
  2. Negative scenarios (invalid inputs, missing required fields, wrong data types)
  3. Boundary and edge cases (empty strings, max-length values, zero, null)
  4. Authentication and authorisation checks
  5. Idempotency and state considerations

Rules:
- Return ONLY a valid JSON array of test case objects. No prose, no markdown fences.
- Each object must have these exact keys:
    id          : string  — short unique slug, e.g. "auth-001"
    category    : string  — one of: positive | negative | edge | security
    title       : string  — human-readable test title
    description : string  — what this test verifies and why it matters
    preconditions: string — any state that must exist before the test runs
    steps       : string[]— ordered list of actions
    expectedResult: string— what a passing result looks like (status, body, behaviour)
    priority    : string  — high | medium | low
- Be specific. "Should return 200" is not useful. "Should return 200 with a bookingid
  integer > 0 and a nested booking object matching the submitted payload" is useful.
- Aim for 8–12 well-considered test cases per endpoint, not an exhaustive list.
`.trim();

export class TestGeneratorAgent extends BaseAgent {
  /**
   * Generate test cases for a single endpoint.
   *
   * @param {EndpointSpec} endpointSpec
   * @returns {Promise<TestCase[]|null>}
   */
  async generateForEndpoint(endpointSpec) {
    const userPrompt = `
Generate test cases for the following REST API endpoint.

Endpoint specification:
${JSON.stringify(endpointSpec, null, 2)}
    `.trim();

    console.log(`[TestGeneratorAgent] Generating test cases for ${endpointSpec.method} ${endpointSpec.path}...`);
    const result = await this.askJSON(SYSTEM_PROMPT, userPrompt);

    if (result) {
      console.log(`[TestGeneratorAgent] Generated ${result.length} test cases.`);
    }

    return result;
  }

  /**
   * Generate test cases for multiple endpoints in sequence.
   *
   * @param {EndpointSpec[]} specs
   * @returns {Promise<Record<string, TestCase[]>>}
   */
  async generateForApi(specs) {
    const results = {};

    for (const spec of specs) {
      const key = `${spec.method} ${spec.path}`;
      results[key] = await this.generateForEndpoint(spec) ?? [];
      // Small delay between agent calls to avoid rate limiting
      await sleep(500);
    }

    return results;
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @typedef {Object} EndpointSpec
 * @property {string} method          HTTP verb: GET | POST | PUT | PATCH | DELETE
 * @property {string} path            e.g. /booking/{id}
 * @property {string} description     What the endpoint does
 * @property {boolean} [requiresAuth] Whether an auth token is required
 * @property {object} [requestSchema] JSON Schema or plain object describing the body
 * @property {object} [responseSchema]JSON Schema or plain object describing the response
 * @property {string[]} [pathParams]  Names of path parameters, e.g. ["id"]
 * @property {string[]} [queryParams] Names of query parameters
 */

/**
 * @typedef {Object} TestCase
 * @property {string}   id
 * @property {string}   category
 * @property {string}   title
 * @property {string}   description
 * @property {string}   preconditions
 * @property {string[]} steps
 * @property {string}   expectedResult
 * @property {string}   priority
 */
