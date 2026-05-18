# AI-AUGMENTED-API-FRAMEWORK Framework

> AI-powered Playwright API testing framework for the Restful-Booker microservice.  

## What This Is

A production-grade API test framework built with **Playwright + JavaScript** that goes beyond basic status-code checks. It features three **AI agents** (powered by OpenAI GPT-4o) that can:

- **Generate test cases** from an API spec description
- **Suggest smart assertions** for any API response
- **Summarise test results** as a QA executive report

The tests themselves run fully without an OpenAI API key — the agents are an additive capability, not a dependency.


## Project Structure

ao-augmented-api-framework/
├── .github/
│   └── workflows/
│       └── playwright.yml        # CI/CD — GitHub Actions
│
├── agents/                       # AI Agents (OpenAI-powered)
│   ├── BaseAgent.js              # Shared OpenAI client + JSON parsing
│   ├── TestGeneratorAgent.js     # Generates test cases from API spec
│   ├── AssertionAgent.js         # Suggests smart assertions for responses
│   └── ReportAnalyzerAgent.js    # Produces executive summary from test results
│
├── config/
│   ├── env/
│   │   ├── dev.env               # Dev environment config
│   │   ├── uat.env               # UAT environment config
│   │   └── prod.env              # Prod environment config
│   ├── environments.js           # Environment loader — reads ENV variable
│   └── global-setup.js           # Pre-run API health check
│
├── fixtures/
│   └── index.js                  # Custom Playwright fixtures (apiClient, authToken, testBooking)
│
├── helpers/
│   ├── ApiClient.js              # Typed HTTP client for every endpoint
│   ├── DataFactory.js            # Test data generation (valid, invalid, boundary)
│   └── assertions.js             # Domain-specific assertion helpers
│
├── scripts/
│   ├── generate-tests.js         # Run the TestGeneratorAgent
│   └── analyze-report.js         # Run the ReportAnalyzerAgent
│
├── tests/
│   ├── auth.spec.js              # POST /auth (12 tests)
│   ├── booking-create.spec.js    # POST /booking (14 tests)
│   ├── booking-read.spec.js      # GET /booking + GET /booking/{id} (12 tests)
│   ├── booking-update.spec.js    # PUT /booking/{id} (10 tests)
│   ├── booking-patch.spec.js     # PATCH /booking/{id} (11 tests)
│   ├── booking-delete.spec.js    # DELETE /booking/{id} (9 tests)
│   └── security.spec.js          # Security & hygiene (11 tests)
│
├── playwright.config.js
├── package.json
├── test-case-design.docx
└── README.md

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 LTS (>=20.19.0) |
| npm | >=10.0.0 |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/Madhuri2510/ai-augmented-api-framework.git
cd ai-augmented-api-framework
npm install
npm install @playwright/test                                              ║
npx playwright install 
```

### 2. Configure environment files

Environment-specific configs live in `config/environments/`. Each file contains
the base URL, credentials, and throttle settings for that environment. You do
**not** need to edit `.env` for switching environments — just pass the `ENV`
variable in your npm command.

```
config/env/dev.env   ← https://restful-booker.herokuapp.com
config/env/uat.env   ← your UAT base URL
config/env/prod.env   ← your Prod base URL
```

Edit each file to set the correct `baseURL` and credentials for your target
environment.

### 3. Set your OpenAI API key (optional — only for AI agent features)

For local dev:
 1. Open config/env/dev.env
 2. Set OPENAI_API_KEY=sk-...


If the key is not set, all 79 tests run normally — the agents simply skip
enrichment with a console warning.

---

## Running the Tests

### Run against a specific environment

Pass the `ENV` variable to select which environment config to load:

```bash
# Dev (default if ENV is not set)
npm run test:dev

# UAT
npm run test:uat

# Prod
npm run test:prod
```

### Run a specific suite against an environment

```bash
npm run test:dev:auth
npm run test:dev:booking:create
npm run test:dev:security
```

### All available npm scripts

```bash
npm test                          # Full suite 
npm run test:dev:auth             # POST /auth tests only
npm run test:uat:booking:create   # POST /booking tests only
npm run test:prod:booking:read    # GET /booking tests only
npm run test:dev:booking:update   # PUT /booking/{id} tests only
npm run test:dev:booking:patch    # PATCH /booking/{id} tests only
npm run test:uat:booking:delete   # DELETE /booking/{id} tests only
npm run test:dev:security         # Security tests only
npm run test:uat:report           # Full suite + open HTML report in browser
```

### Run with verbose output

```bash
npm run test:uat --reporter=list
```

### Run a single test by ID

```bash
npm run test:uat -- --grep "AUTH-001"
npm run test:dev -- --grep "SEC-001"
```

---

## AI Agent Features

### Generate test cases from the API spec

Uses OpenAI GPT-4o to analyse each endpoint and return structured test case
scenarios:

```bash
OPENAI_API_KEY=sk-... npm run generate:tests
# Output: reports/ai-generated-test-cases.json
```

### Analyse test results with AI

After a test run, generate an executive summary:

```bash
npm run test:dev                        # run tests first
npm run agent:report
# Output: reports/ai-summary.md + printed to stdout
```

### Use AssertionAgent in your own scripts

```javascript
import { AssertionAgent } from './agents/AssertionAgent.js';

const agent = new AssertionAgent();
const suggestions = await agent.suggestAssertions(
  responseBody,
  'POST /booking response'
);
// suggestions → [{ field, assertion, rationale, playwrightCode }]
```

---

## Environment Configuration

Each environment file exports the same shape:

```javascript
// config/environments/dev.js
export const envConfig = {
  baseURL: 'https://restful-booker.herokuapp.com',
  auth: {
    username: 'admin',
    password: 'password123',
  },
  throttleMs: 200,  // delay between write ops — increase if API rate-limits
};
```

The loader (`config/environments.js`) reads the `ENV` environment variable and
imports the matching file. If `ENV` is not set it falls back to `dev`. An
unrecognised value throws at startup with a clear message rather than silently
using the wrong config.

### Environment file locations

| File | Purpose |
|---|---|
| `config/env/dev.env`    | Dev environment |
| `config/env/uat.env`    | UAT environment |
| `config/env/prod.env`   | Prod environment |

---

## Assertion Philosophy

Every test asserts more than just the status code:

```javascript
//  What this framework does NOT do
expect(res.status()).toBe(200);

// What this framework does
expect(res.status()).toBe(200);
const body = await res.json();

// Shape
expect(typeof body.bookingid).toBe('number');
expect(typeof body.booking.depositpaid).toBe('boolean');

// Range
expect(body.bookingid).toBeGreaterThan(0);
expect(body.booking.totalprice).toBeGreaterThanOrEqual(0);

// Consistency — what you wrote is what you get back
expect(body.booking.firstname).toBe(payload.firstname);
expect(body.booking.bookingdates.checkin).toBe(payload.bookingdates.checkin);
```

See `helpers/assertions.js` for the full set of reusable assertion helpers.

---

## CI/CD

The GitHub Actions workflow (`.github/workflows/playwright.yml`) runs
automatically on:

- Every push to `main` / `develop`
- Every pull request to `main`
- Nightly at 06:00 UTC
- Manual trigger via Actions tab (`workflow_dispatch`)

CI runs against **dev** by default. To target UAT or prod, set `ENV` as a
repository variable under **Settings → Secrets and variables → Actions →
Variables**.

**Artefacts uploaded per run:**
- `playwright-report/` — interactive HTML report (30-day retention)
- `reports/test-results.json` — machine-readable results (30-day retention)
- `reports/ai-summary.md` — OpenAI executive summary (when API key is set)

### Setting up CI secrets and variables

| Name | Type | Required | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Secret | Optional | Enables AI agent features in CI |
| `BOOKER_USERNAME` | Secret | Optional | Defaults to `admin` |
| `BOOKER_PASSWORD` | Secret | Optional | Defaults to `password123` |
| `ENV` | Variable | Optional | `dev` / `uat` / `prod` — defaults to `dev` |

---

## Key Design Decisions

**Sequential execution (`workers: 1`)** — the API is a shared sandbox. Parallel
writes create race conditions between tests sharing booking IDs. Sequential is
slower but reliable.

**Fresh fixtures per test** — the `testBooking` fixture creates a booking before
each test and deletes it after, giving each test a clean slate with no dependency
on pre-existing state.

**Environment-first config** — base URL and credentials are never hardcoded in
test files. Switching from dev to UAT or prod is a single `ENV=` prefix — no
file edits required.

**OpenAI agents are optional** — all test logic lives in Playwright specs. The
OpenAI agents add intelligence but own no assertions. Remove `OPENAI_API_KEY`
and every test runs identically.

---

## Test Counts

| Suite | Tests |
|---|---|
| POST /auth | 12 |
| POST /booking | 14 |
| GET /booking + GET /booking/{id} | 12 |
| PUT /booking/{id} | 10 |
| PATCH /booking/{id} | 11 |
| DELETE /booking/{id} | 9 |
| Security | 11 |
| **Total** | **79** |

---

## Troubleshooting

**`globalSetup` fails — API unreachable**  
The public Restful-Booker API occasionally goes down. Wait a few minutes and
retry. For UAT/prod, verify `baseURL` in the relevant environment file.

**Wrong environment running**  
Check what `ENV` is set to: `echo $ENV`. If unset it defaults to `dev`. Always
prefix commands explicitly: `npm run test:dev`.

**Tests fail intermittently**  
The dev API resets its state periodically. If you see 404s on booking IDs that
should exist, the reset likely happened mid-run. Re-run the suite.

**`OPENAI_API_KEY` warnings in output**  
Expected if the key is not set — agents log a warning and no-op. All 79 tests
still pass normally.

**Rate limiting in CI**  
Increase `throttleMs` in the relevant environment file (e.g.
`config/env/uat.env`).
