# Backend, API, and CLI Checklist

Each item is a check an operator or a client developer would fail you on. Security follows the `application-security` skill, not this file.

## Errors

- Every error has a stable machine code, a correct status, and a message that says what to do next. One error shape across the API, for example RFC 9457 problem details (https://www.rfc-editor.org/rfc/rfc9457)
- No stack trace, query, or internal name reaches a client

## Dependencies fail

- Every outbound call has a timeout
- Retries only on idempotent operations, with backoff and jitter. A client-retried write takes an idempotency key
- A slow or down dependency degrades the response it feeds, not the whole service

## Speed

- Each endpoint has a stated p95 latency budget, measured under the expected load
- No query runs per item in a loop. Each query path has an index, checked with the database's query plan
- List endpoints paginate, preferably by cursor, with a maximum page size

## Operability

- Structured logs carry a request or trace ID across services
- Rate, errors, and duration are recorded per endpoint
- Liveness and readiness checks are separate
- Configuration is validated at start. A missing or bad value stops the process with the key's name
- Shutdown drains in-flight requests
- Migrations follow expand, migrate, contract, so the old and new code both run during a deploy
- Practice reference: https://sre.google/sre-book/table-of-contents/

## Data

- An invariant that spans rows is kept inside one transaction
- Time is stored in UTC. Money is stored in integer minor units or as a decimal, never as a float

## Contract

- The API description (OpenAPI, protobuf, GraphQL schema) is generated from the code or checked against it in CI
- A breaking change gets a new version and a deprecation path

## CLI

Reference: https://clig.dev/

- `--help` has examples. Exit codes are documented and non-zero on failure
- Data goes to stdout and messages to stderr. `--json` exists for scripts. Colour is off when the output is not a terminal
- A long operation shows progress. A destructive one asks first, with a flag for scripts

## Library

- Public functions have doc comments with an example. Errors are typed, so a caller can branch on them
- Versions follow semantic versioning, and the changelog names every breaking change
