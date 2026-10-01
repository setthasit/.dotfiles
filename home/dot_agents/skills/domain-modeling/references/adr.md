# ADRs

Reached from `SKILL.md` when a decision is hard to reverse and surprising without context.

## Location and naming

`docs/adr/NNNN-kebab-title.md` — zero-padded four-digit sequence, allocated once and **never renumbered**. A withdrawn ADR keeps its number; the gap is part of the record.

## Shape

Prose, not a rigid template. Required, in this order:

| Part | Content |
|---|---|
| Decision | One line at the top. The choice, not the discussion |
| Constraint | What forced it: the limit, contract, or failure that removed the alternatives |
| Afterwards | What it makes true — the invariants other work must respect |

Alternatives are optional. Include one only when it was rejected for a concrete named reason: a measured number, a named limit, a contract clause. "Seemed more complex" is not a reason; drop the section.

## Living documents

A later finding **appends**. It never rewrites.

- New evidence, a version bump, a caveat found in production → append `## Update, YYYY-MM-DD` at the bottom, carrying its verification inline: exact command, exact version, exact output. A claim with no command behind it is not an update.
- Never edit the original text to match what you now know. The wrong-then-right sequence is the value of the file.
- **Supersede only when the decision itself is reversed.** Then write the new ADR and link both ways: the old one gains `Superseded by 0007`, the new one `Supersedes 0004`.

## What an ADR is not

| Not this | Where it goes |
|---|---|
| A design doc dump | the plan document |
| A changelog of what shipped | git history, `CHANGELOG` |
| Prose defining a term | `CONTEXT.md`, `## Language` |
| A decision that is cheap to reverse | just make it |

## Worked ADR

````markdown
# 0004 — Idempotency keys are client-supplied

Every write to `/v1/payments` requires a client-supplied `Idempotency-Key` header; the server never generates one.

Retries arrive from mobile clients on networks that drop the response after the write commits. A server-generated key cannot dedupe a request whose response the client never saw.

Afterwards:
- `POST /v1/payments` returns 400 without the header. No default, no grace period.
- Keys are stored 24h scoped to the account; a replay past that window creates a second payment.
- Any new write endpoint inherits this rule. Adding one without a key check is a bug, not a gap.

## Update, 2026-05-02

24h retention is insufficient for one partner's nightly batch, which retries at +26h.
`psql -c "select count(*) from duplicate_payment_pairs where window_days = 30"` → `31`.
Retention raised to 72h in `payments@1.9.0`; the decision itself stands.
````
