# Pass 2 - Synthetic Fixture Service

Status: implementation candidate; closure requires local and GitHub CI GREEN.

## Scope

Pass 2 implements a candidate-owned local fixture service only. It does not reproduce Stacktape internals and does not use AWS credentials, Stacktape credentials, production endpoints, customer data, or cloud mutation.

## Public local routes

- GET /health
- GET /api/items
- GET /api/items/:id
- POST /api/items
- GET /api/runtime

## Deterministic fault modes

- none
- unhealthy
- slow
- malformed-json
- intermittent-500
- shutdown-delay

Fault mode is selected only at process startup through local configuration. There is no public endpoint that changes fault mode.

## Safety boundary

The server binds only to 127.0.0.1 or ::1. P2 performs no external network calls and has no cloud mutation path.

## P2 gate

The P2 smoke runner starts ephemeral localhost servers and verifies all six modes. Formal unit/contract expansion belongs to Pass 3 and is intentionally not implemented here.
