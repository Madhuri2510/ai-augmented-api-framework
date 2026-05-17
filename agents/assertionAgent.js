/**
 * AssertionAgent — AI agent that analyses an actual API response and
 * suggests additional assertions the test suite should be making.
 *
 * Use this in two ways:
 *  A) During test development: pass a real response body and get back
 *     a list of assertion suggestions to implement.
 *  B) At runtime in tests: validate a response against an expected schema
 *     and get an AI-written narrative explanation when something is wrong.
 *
 * This keeps test assertions *smart* — catching semantic issues,
 * not just status code mismatches.
 */

import { BaseAgent } from './BaseAgent.js';

const SUGGESTION_SYSTEM_PROMPT = `
You are a senior QA engineer reviewing an API response.
Your job is to suggest concrete assertions that a test suite should make
beyond checking the HTTP status code.

Rules:
- Return ONLY valid JSON — an array of assertion objects. No prose, no fences.
- Each object must have:
    field       : string  — dot-notation path to the field being asserted, e.g. "booking.totalprice"
    assertion   : string  — what to assert, e.g. "must be a positive integer"
    rationale   : string  — why this assertion matters (1 sentence)
    playwrightCode: string— a concrete expect() call for Playwright, e.g. "expect(body.bookingid).toBeGreaterThan(0)"
- Focus on: data types, non-null/non-empty checks, value ranges, format validation,
  business logic (e.g. checkout > checkin), and consistency with the request payload.
- Do NOT suggest asserting the status code — that is already covered.
`.trim();

const ANALYSIS_SYSTEM_PROMPT = `
You are a QA engineer analysing a test failure.
Given an expected schema and the actual API response, explain:
  1. Which fields are wrong or missing
  2. What the likely root cause is
  3. Whether this looks like a backend bug or a test data issue

Be concise. Return plain prose — no JSON, no markdown, just two or three paragraphs.
`.trim();

export class AssertionAgent extends BaseAgent {
  /**
   * Suggest assertions for a given response body.
   *
   * @param {object} responseBody     Parsed JSON from the API
   * @param {string} endpointContext  Short description, e.g. "POST /booking response"
   * @returns {Promise<AssertionSuggestion[]|null>}
   */
  async suggestAssertions(responseBody, endpointContext) {
    const userPrompt = `
Context: ${endpointContext}

API Response Body:
${JSON.stringify(responseBody, null, 2)}

Suggest the most valuable assertions for this response.
    `.trim();

    return this.askJSON(SUGGESTION_SYSTEM_PROMPT, userPrompt);
  }

  /**
   * Analyse a mismatch between expected and actual and return a human-readable
   * explanation. Useful for enriching error messages in CI failure reports.
   *
   * @param {object} expected
   * @param {object} actual
   * @param {string} context
   * @returns {Promise<string|null>}
   */
  async analyseFailure(expected, actual, context) {
    const userPrompt = `
Context: ${context}

Expected:
${JSON.stringify(expected, null, 2)}

Actual (what the API returned):
${JSON.stringify(actual, null, 2)}

Explain the discrepancy and its likely cause.
    `.trim();

    return this.ask(ANALYSIS_SYSTEM_PROMPT, userPrompt);
  }
}

/**
 * @typedef {Object} AssertionSuggestion
 * @property {string} field
 * @property {string} assertion
 * @property {string} rationale
 * @property {string} playwrightCode
 */
