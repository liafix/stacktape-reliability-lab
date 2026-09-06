# Security and zero-cloud policy

Passes 0-1 are local-only and credential-free.

## Forbidden in candidate execution

- AWS access keys or session credentials
- Stacktape credentials/tokens
- production Stacktape endpoints
- customer data
- cloud-mutating commands such as Stacktape deploy/delete or AWS CloudFormation deploy/delete
- active security probing of third-party systems

The Pass 1 safety guards intentionally fail when executable scripts/workflows contain forbidden cloud-mutation commands or when likely plaintext secrets are introduced outside approved synthetic fixtures/tests.
