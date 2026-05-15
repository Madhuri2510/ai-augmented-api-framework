#  AI AUGMENTED API Framework

> AI-powered Playwright API testing framework for the Restful-Booker microservice.  
> Built for the Camascope QA Automation Engineer technical assessment.

---

## What This Is

A production-grade API test framework built with **Playwright + JavaScript** that goes beyond basic status-code checks. It features three **AI agents** (powered by Claude) that can:

- **Generate test cases** from an API spec description
- **Suggest smart assertions** for any API response
- **Summarise test results** as a QA executive report

The tests themselves run fully without an Anthropic API key — the agents are an additive capability, not a dependency.

---

## Project Structure

```
restful-booker-ai-qa/
├── .github/
│   └── workflows/
│       └── playwright.yml        # CI/CD — GitHub Actions
│
├── agents/                       # AI Agents (Claude-powered)
│   ├── BaseAgent.js              # Shared Anthropic client + JSON parsing
│   ├── TestGeneratorAgent.js     # Generates test cases from API spec
│   ├── AssertionAgent.js         # Suggests smart assertions for responses
│   └── ReportAnalyzerAgent.js    # Produces executive summary from test results
│
├── config/
│   ├── environments.js           # All env vars and endpoint config
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
├── .env.example
├── playwright.config.js
├── package.json
├── TEST_STRATEGY.md              # Full test strategy document
└── README.md
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/restful-booker-ai-qa.git
cd restful-booker-ai-qa
npm install
npm install @playwright/test                                              ║
npx playwright install 
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults work out of the box — the Restful-Booker API is public:

```
BASE_URL=https://restful-booker.herokuapp.com
BOOKER_USERNAME=admin
BOOKER_PASSWORD=password123
ANTHROPIC_API_KEY=           # optional — only needed for AI agents
```

To use the AI agent features, add your Anthropic API key:

```bash
# Get a key at https://console.anthropic.com
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

---

## Running the Tests

### Run the full suite

```bash
npm test
```

### Run a specific suite

```bash
npm run test:auth
npm run test:booking:create
npm run test:booking:read
npm run test:booking:update
npm run test:booking:patch
npm run test:booking:delete
npm run test:security
```

### Run with HTML report

```bash
npm run test:report
# Opens playwright-report/index.html in your browser
```

### Run with verbose output

```bash
npx playwright test --reporter=list
```

### Run a single test by title

```bash
npx playwright test --grep "AUTH-001"
```

---

## AI Agent Features

### Generate test cases from the API spec

Uses Claude to analyse each endpoint and return structured test case scenarios:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run generate:tests
# Output: reports/ai-generated-test-cases.json
```

### Analyse test results with AI

After a test run, generate an executive summary:

```bash
npm test                  # run tests first (generates reports/test-results.json)
ANTHROPIC_API_KEY=sk-ant-... npm run agent:report
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
// suggestions is an array of { field, assertion, rationale, playwrightCode }
```

---

## Assertion Philosophy

Every test asserts more than just the status code:

```javascript
// ❌ What this framework does NOT do
expect(res.status()).toBe(200);

// ✅ What this framework does
expect(res.status()).toBe(200);
const body = await res.json();

// Shape
expect(typeof body.bookingid).toBe('number');
expect(typeof body.booking.firstname).toBe('string');
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

The GitHub Actions workflow runs automatically on:

- Every push to `main` / `develop`
- Every pull request to `main`
- Nightly at 06:00 UTC
- Manual trigger via Actions tab

**Artefacts uploaded per run:**
- `playwright-report/` — interactive HTML report
- `reports/test-results.json` — machine-readable results
- `reports/ai-summary.md` — AI executive summary (when API key is set)

### Setting up CI secrets

In your GitHub repo: **Settings → Secrets and variables → Actions**

| Secret | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | Enables AI agent features in CI |
| `BOOKER_USERNAME` | Optional | Defaults to `admin` |
| `BOOKER_PASSWORD` | Optional | Defaults to `password123` |

---

## Key Design Decisions

**Sequential execution (`workers: 1`)** — the Restful-Booker API is a shared public
sandbox. Running tests in parallel would hammer it and produce race conditions
between tests sharing the same booking IDs. Sequential is slower but reliable.

**Fresh fixtures per test** — the `testBooking` fixture creates a new booking
before each test and deletes it after. This gives each test a clean slate
without depending on pre-existing state.

**Documented known behaviours** — the API has quirks (201 on delete, 405 on
non-existent ID, lenient type coercion). Rather than marking tests as expected
failures, these are explicitly documented in `TEST_STRATEGY.md` and in the
test's inline comment so the next engineer understands the intent.

**Agents are optional** — all test logic lives in the Playwright specs. The
AI agents layer adds intelligence but do not own any assertions. Remove
`ANTHROPIC_API_KEY` and every test still runs identically.

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
The public Restful-Booker API occasionally goes down. Wait a few minutes and retry.

**Tests fail intermittently**  
The API resets its state periodically. If you see 404s on booking IDs that
should exist, the reset likely happened mid-run. Re-run the suite.

**`ANTHROPIC_API_KEY` warnings in output**  
Expected if you haven't set the key — agents log a warning and no-op. All tests pass normally.

**Rate limiting in CI**  
If you see 429 responses, increase `throttleMs` in `config/environments.js`.
