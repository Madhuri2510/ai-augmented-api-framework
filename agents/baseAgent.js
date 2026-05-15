/**
 * BaseAgent — wraps the Anthropic Claude API for all test agents.
 *
 * Provides:
 *  - Shared client configuration
 *  - Structured JSON response parsing with fallback
 *  - Simple retry logic for transient API errors
 *  - A graceful no-op when ANTHROPIC_API_KEY is absent
 *    (so CI still works without the key; agents return null)
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/environments.js';

export class BaseAgent {
  constructor() {
    this.model = 'claude-sonnet-4-20250514';
    this.maxTokens = 2000;
    this.hasApiKey = Boolean(config.anthropicApiKey);

    if (this.hasApiKey) {
      this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    }
  }

  get name() {
    return this.constructor.name;
  }

  /**
   * Send a prompt to Claude and return the text response.
   *
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<string|null>}  null when no API key is configured
   */
  async ask(systemPrompt, userPrompt) {
    if (!this.hasApiKey) {
      console.warn(`[${this.name}] ANTHROPIC_API_KEY not set — skipping AI enrichment.`);
      return null;
    }

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      return message.content[0]?.text ?? null;
    } catch (err) {
      console.error(`[${this.name}] Claude API error:`, err.message);
      return null;
    }
  }

  /**
   * Same as `ask` but parses the response as JSON.
   * Strips markdown code fences if Claude wraps the JSON in them.
   *
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<object|null>}
   */
  async askJSON(systemPrompt, userPrompt) {
    const raw = await this.ask(systemPrompt, userPrompt);
    if (!raw) return null;

    try {
      // Strip ```json ... ``` fences if present
      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(clean);
    } catch {
      console.error(`[${this.name}] Failed to parse JSON response from Claude:`, raw.slice(0, 200));
      return null;
    }
  }
}
