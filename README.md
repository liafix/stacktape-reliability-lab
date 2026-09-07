# Stacktape Reliability Lab

Independent candidate QA automation demonstrator for the Stacktape QA Automation Engineer application.

## Current implementation status

- Pass 0: repository foundation and reproducibility contract
- Pass 1: QA-core contracts plus secret/cloud-mutation safety guards
- Pass 2: synthetic localhost fixture service implemented
- Pass 3: unit + contract coverage for the synthetic fixture boundary
- Pass 4: Supertest HTTP integration coverage against the loopback-only synthetic fixture service
- Pass 5: Chromium Playwright E2E against the loopback-only synthetic fixture service
- Pass 6: deterministic failure injection with QA-core classification and retry policy checks
- Pass 7+: intentionally not implemented yet

## Safety boundary

This repository is based only on public Stacktape documentation/interfaces and candidate-owned synthetic test logic. It does **not** use Stacktape credentials, AWS credentials, customer data, production Stacktape endpoints, or cloud-mutating commands during candidate execution.

See `DISCLAIMER.md` and `SECURITY.md`.
