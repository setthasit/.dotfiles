# Comment Calibration

Worked examples of the earn test, and the audit pass for a file already full of comments.

## Keep — outside fact or uncarryable contract, one line each

```
// Stripe rounds half-up; match it or our totals stop reconciling with theirs.
// Retry 429 and 503 only — this vendor returns 500 for permanent validation errors.
// Score is higher-is-better; implementations negate BM25 and vector distance.
// Second precision, UTC — the upstream API truncates anything finer.
// Nil Cursor means never checkpointed — start a full sync.
// Lease expires 60s after the last heartbeat; never blocks.
// Replaces the whole chunk set; nil clears it.
```

Each prevents a specific bug: a caller losing sub-second data, ranking the worst hits first, treating nil as an error, heartbeating too slowly, wiping data with a nil it thought was a no-op.

## Delete — derivable, or prose

```
// requests 500m of CPU                       → above `cpu: 500m`
// UserService handles user business logic.    → above `type UserService interface`
// Returns an error if the operation fails.    → the signature said so
// Close releases the store's resources.       → restates the name
// SQLite is the current implementation, not an architectural commitment.
// The interface grows additively: edges land in a later change-set.
```

A 20-line type header explaining layering philosophy is a design doc in the wrong file — delete from source, offer to rehome it.

## Auditing a comment-heavy file

1. Count comment lines against total. Over ~10% → full re-triage.
2. Run the earn test on each comment **individually**. A 20-line comment with one good line is one good line plus 19 deletions.
3. Read the code the comment describes before touching either — the comment is rarely the real problem.
4. Cut survivors to budget.
5. Report what you deleted and why. Prose worth saving → tell the user and propose where it goes.
