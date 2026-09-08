# PASS 7 - CI + Evidence/Reporting

Status at implementation commit: LOCAL GREEN / CI PENDING.

PASS 7 converts already-implemented QA behavior into reproducible CI evidence without changing the runtime safety boundary.

## Evidence outputs

`npm run evidence:generate` creates ignored local output under `artifacts/p7/`:

- `evidence-summary.json` - machine-readable schema-versioned evidence
- `evidence-report.md` - reviewer-readable report

The evidence generator observes five deterministic PASS 6 failures against the loopback-only synthetic fixture service and maps them through the existing QA-core classification/retry policy.

The P7 GitHub workflow preserves all P0-P6 gates, generates and verifies the evidence contract, then uploads `artifacts/p7/` as `p7-ci-evidence-<commit-sha>`.

Repository permissions remain `contents: read`.

PASS 7 remains synthetic-data-only, loopback-only (`127.0.0.1`) and EUR0 application cloud. It uses no AWS credentials, Stacktape credentials, production endpoints, customer data, or deployment/cloud-mutation commands.

PASS 8 Evidence UI and Vercel deployment are deliberately not implemented in PASS 7.
