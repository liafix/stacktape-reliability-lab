# PASS 8 - Evidence UI + Release/Vercel

PASS 8 is the candidate-facing release layer of Stacktape Reliability Lab.

## Frozen-roadmap role

P2-P7 remain QA/test/CI evidence. PASS 8 is the first pass allowed to create a public Vercel surface.

The public surface does **not** deploy the synthetic fixture service. It publishes only a static evidence UI.

## Evidence provenance

The UI snapshot is frozen from the verified PASS 7 GitHub Actions evidence artifact:

- P7 implementation commit: `a3c4df5f70f6d5f91469c4358c099b63aff35310`
- P7 closure commit: `f4c7fdd42e0c760acb00c49d6438ddbd552f969f`
- P7 clean workflow run: `34198806637`
- P7 artifact: `10044979752`
- Artifact name: `p7-ci-evidence-a3c4df5f70f6d5f91469c4358c099b63aff35310`
- Artifact digest: `sha256:900198da641a40bcda3d791e8b841b1d0c225941b90ebe6f3c3bd44f46bd3cb5`
- Evidence contract: schema v1, 5 total, 5 passed, 0 failed

## Public runtime boundary

Vercel receives only:

- static HTML
- static CSS
- static browser JavaScript
- frozen JSON evidence + release provenance

The deployed candidate UI has:

- no AWS credentials
- no Stacktape credentials
- no customer data
- no production API targets
- no fault-control endpoint
- no synthetic fixture runtime
- no cloud mutation capability

## Local verification

PASS 8 adds a separate localhost-only Playwright gate for the static release:

- desktop evidence rendering
- 5/5 evidence contract
- provenance fields
- no external requests during page load
- mobile rendering
- no horizontal overflow

## Release flow

1. PASS 8 implementation passes locally.
2. Push to GitHub.
3. All P0-P8 clean-runner gates must be GREEN.
4. Only then connect/import the GitHub repository into Vercel.
5. Vercel builds with `npm run build:evidence-ui`.
6. Production URL is smoke-tested before PASS 8 final closure.

Do not mark PASS 8 GREEN/CLOSED until both clean GitHub CI and the public Vercel smoke check are GREEN.
