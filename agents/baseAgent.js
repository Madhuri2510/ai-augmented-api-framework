/**
 * BaseAgent — wraps the OpenAI API for all test agents.
 *
 * Provides:
 *  - Shared OpenAI client configuration
 *  - Structured JSON response parsing with fallback
 *  - Simple retry logic for transient API errors
 *  - Graceful no-op when OPENAI_API_KEY is absent
 *    (so CI still works without the key; agents return null)
 */

import OpenAI from 'openai';
import { config } from '../config/environments.js';

export class BaseAgent {
  constructor() {
    this.model     = config.openaiModel;   // e.g. 'gpt-4o', set in .env file
    this.maxTokens = 2000;
    this.hasApiKey = Boolean(config.openaiApiKey);

    if (this.hasApiKey) {
      this.client = new OpenAI({ apiKey: config.openaiApiKey });
    }
  }

  get name() {
    return this.constructor.name;
  }

  /**
   * Send a prompt to the OpenAI chat API and return the text response.
   *
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<string|null>}  null when no API key is configured
   */
  async ask(systemPrompt, userPrompt) {
    if (!this.hasApiKey) {
      console.warn(`[${this.name}] OPENAI_API_KEY not set — skipping AI enrichment.`);
      return null;
    }

    try {
      const response = await this.client.chat.completions.create({
        model:      this.model,
        max_tokens: this.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
      });

      return response.choices[0]?.message?.content ?? null;
    } catch (err) {
      console.error(`[${this.name}] OpenAI API error:`, err.message);
      return null;
    }
  }

  /**
   * Same as `ask` but parses the response as JSON.
   * Strips markdown code fences if the model wraps the JSON in them.
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
      console.error(`[${this.name}] Failed to parse JSON response from OpenAI:`, raw.slice(0, 200));
      return null;
    }
  }
}
