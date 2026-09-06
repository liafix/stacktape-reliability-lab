# P1.1 Toolchain Restoration Gate — BLOCKER REPORT

Date: 2026-09-05
Project: Stacktape Reliability Lab
Checkpoint: P1.1 Toolchain Restoration Gate
Status: **BLOCKED — npm registry unavailable**

## Requested gate

Restore the approved release toolchain before Pass 2:

- pin and install TypeScript
- pin and install Jest
- pin and install ESLint
- migrate bootstrap `node:test` tests to Jest without behavioral changes
- remove the temporary Node built-in declaration shim / bootstrap fallbacks
- re-run fresh-copy gates: `npm ci`, lint, typecheck, unit, contract, secret guard, cloud-mutation guard

## Registry availability checks

The gate was stopped before any dependency migration because the npm registry was not reachable from the execution environment.

Observed checks:

1. `npm ping --registry=https://registry.npmjs.org/`
   - result: timed out

2. `npm view typescript version --registry=https://registry.npmjs.org/`
   - result: timed out after 10 seconds (`exit 124`)

3. `curl -I https://registry.npmjs.org/typescript`
   - result: `Could not resolve host: registry.npmjs.org` (`curl exit 6`)

4. DNS lookup (`getent hosts registry.npmjs.org`)
   - result: no address returned

## Decision

Per the approved stop condition, **no workaround was attempted**:

- no alternate package registry
- no vendored third-party packages
- no dependency copying from unrelated caches
- no manual shim expansion
- no migration to another test/lint framework
- no Pass 2 implementation

The existing P0/P1 bootstrap implementation remains unchanged.

## Current state

- P0 Foundation: GREEN (bootstrap toolchain)
- P1 QA Core + Safety Guards: GREEN (bootstrap toolchain)
- P1.1 Approved TypeScript/Jest/ESLint restoration: **BLOCKED**
- P2 Synthetic Fixture Service: **NOT STARTED**
- Cloud spend: €0
- AWS credentials: 0
- Stacktape credentials: 0
- Production Stacktape calls: 0

## Unblock condition

Re-run P1.1 only when `registry.npmjs.org` resolves and package metadata can be fetched normally. Then:

1. pin approved dependencies,
2. migrate tests to Jest without changing assertions/behavior,
3. replace bootstrap lint with ESLint,
4. remove `types/node-shim.d.ts` once `@types/node` is available,
5. run fresh-copy `npm ci`,
6. close all P1.1 gates before Pass 2.

## Recheck attempt — 2026-09-05 17:28 Europe/Bratislava

P1.1 was re-run exactly as requested, beginning with registry availability only. The registry is still unavailable, so the stop condition fired before any toolchain or source-code changes.

Observed evidence:

1. `getent hosts registry.npmjs.org`
   - result: no address returned (`exit 2`)

2. `curl -I --connect-timeout 4 --max-time 6 https://registry.npmjs.org/`
   - result: `curl: (6) Could not resolve host: registry.npmjs.org`

3. `npm ping --registry=https://registry.npmjs.org/ --fetch-timeout=3000 --fetch-retries=0`
   - result: `EAI_AGAIN getaddrinfo registry.npmjs.org`

Decision: **BLOCKED remains in force.** No Jest/ESLint/@types/node install, no test migration, no shim removal, no alternate registry, and no Pass 2 implementation were attempted.
