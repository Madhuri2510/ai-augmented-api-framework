/**
 * ReportAnalyzerAgent — AI agent that reads the Playwright JSON test report
 * and produces a human-readable executive summary with prioritised action items.
 *
 * Run after a test suite completes:
 *   node scripts/analyze-report.js
 *
 * Output is printed to stdout and saved to reports/ai-summary.md
 */

import { BaseAgent } from './BaseAgent.js';

const SYSTEM_PROMPT = `
You are a QA lead reviewing automated test results.
Given a structured test report, produce:

  1. **Executive Summary** (3–5 sentences): overall health, pass rate, notable trends
  2. **Failed Tests** (if any): for each failure, explain what it means in plain English
     and rate the severity (Critical / High / Medium / Low)
  3. **Patterns & Risks**: are failures clustered around one area? Is there a regression risk?
  4. **Recommended Actions**: 3–5 concrete next steps for the engineering team

Format your response in Markdown with clear headings.
Be direct and actionable — avoid filler language.
`.trim();

export class ReportAnalyzerAgent extends BaseAgent {
  /**
   * Analyse a Playwright test report and return a Markdown summary.
   *
   * @param {PlaywrightReport} report  Parsed JSON from playwright's json reporter
   * @returns {Promise<string|null>}  Markdown string
   */
  async analyze(report) {
    // Distil the report to what the agent actually needs — avoid sending megabytes of logs
    const summary = this._distilReport(report);

    const userPrompt = `
Playwright test report summary:
${JSON.stringify(summary, null, 2)}

Produce the QA report as described.
    `.trim();

    return this.ask(SYSTEM_PROMPT, userPrompt);
  }

  /**
   * Reduce the full Playwright JSON report to just the fields OpenAI needs.
   * This avoids sending huge payloads to the API.
   */
  _distilReport(report) {
    const suites = report.suites ?? [];
    const allTests = this._flattenTests(suites);

    const passed  = allTests.filter((t) => t.status === 'passed');
    const failed  = allTests.filter((t) => t.status === 'failed');
    const skipped = allTests.filter((t) => t.status === 'skipped');

    return {
      stats: {
        total:   allTests.length,
        passed:  passed.length,
        failed:  failed.length,
        skipped: skipped.length,
        passRate: allTests.length > 0
          ? `${((passed.length / allTests.length) * 100).toFixed(1)}%`
          : '0%',
      },
      failures: failed.map((t) => ({
        title:  t.title,
        file:   t.location?.file,
        error:  t.errors?.[0]?.message?.slice(0, 300) ?? 'No error message captured',
      })),
    };
  }

  _flattenTests(suites, acc = []) {
    for (const suite of suites) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests ?? []) {
            acc.push({
              title:    `${suite.title} > ${spec.title}`,
              status:   test.results?.[0]?.status ?? 'unknown',
              duration: test.results?.[0]?.duration,
              errors:   test.results?.[0]?.errors,
              location: spec.file ? { file: spec.file } : undefined,
            });
          }
        }
      }
      if (suite.suites) this._flattenTests(suite.suites, acc);
    }
    return acc;
  }
}

/** @typedef {object} PlaywrightReport */
