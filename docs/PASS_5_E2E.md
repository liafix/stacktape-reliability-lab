# PASS 5 - Playwright E2E

Status at implementation commit: LOCAL GREEN / CI PENDING.

## Scope

PASS 5 adds Chromium Playwright end-to-end coverage against the candidate-owned synthetic fixture service.

The Playwright web server is restricted to:
- `127.0.0.1`
- fixed local port `4317`
- `faultMode=none`
- synthetic in-memory data only

Browser coverage:
- navigate to `GET /health`
- validate the shared health contract
- validate `GET /api/runtime`
- list synthetic items
- create a synthetic item from browser `fetch`
- retrieve the created item
- validate invalid-create `400`
- validate missing-item `404`
- validate unknown-route `404`
- assert that browser traffic never leaves the approved loopback origin

## Deliberate exclusions

PASS 5 does not add failure-injection scenarios, external-network testing, AWS or Stacktape credentials, production endpoints, customer data, cloud mutation, Evidence UI, or Vercel deployment.

Failure-injection expansion remains PASS 6.
