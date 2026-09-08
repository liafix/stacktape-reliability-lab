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
- Pass 7: CI evidence generation, machine-readable JSON, reviewer-readable Markdown, and GitHub Actions artifact upload
- Pass 8: static candidate Evidence UI + release provenance + Vercel-ready build; local GREEN, clean CI and production deployment verification pending

## Safety boundary

This repository is based only on public Stacktape documentation/interfaces and candidate-owned synthetic test logic. It does **not** use Stacktape credentials, AWS credentials, customer data, production Stacktape endpoints, or cloud-mutating commands during candidate execution.

See `DISCLAIMER.md` and `SECURITY.md`.

## Candidate release

PASS 8 publishes only the static Evidence UI. The synthetic fixture service and failure modes remain localhost/CI-only and are never exposed as a public runtime.

Production Vercel URL is recorded only after clean PASS 8 GitHub Actions and post-deploy smoke verification.