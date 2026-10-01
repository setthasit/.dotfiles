# {Project} — Context

> Copy to the repo root as `CONTEXT.md`. Every entry below is an EXAMPLE: replace it,
> then delete this block. Format rules and the entry gate: `skill://domain-modeling`.

## Language

<!-- EXAMPLE — replace -->
**Workspace**: the billing and permission boundary; every row in the database is scoped to exactly one.
_Avoid_: org, organisation, tenant, account

## Relationships

<!-- EXAMPLE — replace -->
- A **Workspace** holds many **Projects**; a **Project** never moves between them.

## Flagged ambiguities

<!-- EXAMPLE — replace -->
- 2026-04-12 — "job" meant both a **Run** and a queued background task. **Run** won for pipeline executions; the queue primitive is a **Task**.
