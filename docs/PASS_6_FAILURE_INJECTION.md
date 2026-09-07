# PASS 6 - Failure Injection

Status at implementation commit: LOCAL GREEN / CI PENDING.

## Scope

PASS 6 validates deterministic QA behavior when the candidate-owned localhost fixture injects known failures.

Scenarios:
- `none`: healthy control
- `unhealthy`: HTTP 503 health failure -> `HEALTH_CHECK_FAILED`
- `slow`: client timeout -> `TIMEOUT`
- `malformed-json`: invalid response body -> `RESPONSE_CONTRACT_FAILED`
- `intermittent-500`: transient API failure -> `TRANSIENT_FAILURE`, retry allowed, next attempt recovers
- `shutdown-delay`: lifecycle budget exceeded -> `SHUTDOWN_TIMEOUT`

The scenarios exercise the existing QA-core `classifyFailure()` and `retryDecision()` policies against a real loopback HTTP server.

## Safety boundary

PASS 6 remains:
- synthetic-data-only
- loopback-only (`127.0.0.1`)
- EUR0-cloud
- zero AWS credentials
- zero Stacktape credentials
- zero production endpoints
- zero customer data
- zero cloud mutation

## Deliberate exclusions

PASS 6 does not implement:
- P7 CI evidence/report generation or persisted evidence artifacts
- Evidence UI
- Vercel deployment
- AWS deployment
- Stacktape deployment
- public fault-control endpoints
- external-network testing
