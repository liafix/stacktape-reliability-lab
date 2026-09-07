# PASS 4 - Integration Tests

Status at implementation commit: LOCAL GREEN / CI PENDING.

## Scope

PASS 4 adds Supertest-based integration coverage against the real synthetic fixture HTTP server started by `startFixtureServer`.

The server is always configured with:
- host `127.0.0.1`
- ephemeral port `0`
- candidate-owned synthetic in-memory data
- deterministic startup fault configuration

Covered HTTP behavior:
- `GET /health`
- `GET /api/runtime`
- `GET /api/items`
- `GET /api/items/:id`
- `POST /api/items`
- missing-item 404
- missing-route 404
- invalid-create validation

Covered deterministic fault modes:
- `none`
- `unhealthy`
- `slow`
- `malformed-json`
- `intermittent-500`
- `shutdown-delay`

## Safety boundary

No external endpoint is contacted by the integration suite. No AWS or Stacktape credentials are used. No production Stacktape API is called. No cloud mutation is performed. PASS 5 Playwright E2E is intentionally not implemented.
