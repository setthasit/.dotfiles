# Comments by Language

The policy in `SKILL.md` is unchanged per language. This file covers the local convention, the local temptation, and the local linter.

## The linter question

A linter that demands a doc comment on every exported symbol (`revive`/`golint` `exported`, `pydocstyle`, `eslint-plugin-jsdoc` `require-jsdoc`, SwiftLint `missing_docs`) is **pressure, not permission**.

In order:

1. Does the rule actually fire on this symbol? Many are opt-in or scoped to a package. Check before obeying.
2. Rule fires and the symbol genuinely needs nothing → the rule is wrong for this repo. **Report it to the user** and propose disabling it. Do not edit lint config yourself.
3. User has not decided yet → satisfy it in **one short line** that adds a real fact if one exists, or states the narrowest true thing if not. Never pad to look thorough.

Never silently disable a lint rule to dodge this, and never write a paragraph because the linter only checks that a comment exists.

## Go

Convention pressure is strongest here: godoc culture says every exported symbol gets `// Name does...`. **That convention is not this policy.** `// UserService handles user business logic.` above `type UserService interface` is a deletion, not documentation.

- Package comment: only when the package's job is not obvious from its import path. Most `internal/` packages need none.
- Exported symbol: zero by default. One line when there is an uncarryable contract — units, nil semantics, ordering, idempotency, goroutine safety.
- `Close() error`, `String() string`, `Error() string` and other stdlib-shaped methods: never. The reader knows.
- Interface method sets: comment the **contract implementations must honour**, never the method's name restated. If nothing binds implementations beyond the signature, write nothing.
- Generated files (`//go:generate`, protobuf, mocks): leave their comments alone; they are not yours to triage.

```go
// Good — a contract the signature cannot carry.
// Not safe for concurrent use; callers serialise access.
func (c *Cache) Set(k string, v []byte)

// Delete — restates the name and the signature.
// Set sets the value v for the key k in the cache.
func (c *Cache) Set(k string, v []byte)
```

## TypeScript / JavaScript

Types already carry what JSDoc traditionally documented. In a typed codebase, `@param`, `@returns`, and `@type` are near-always deletions.

- `@param id The id` / `@returns The result` — banned, echoes the signature.
- Keep `@deprecated` (tooling acts on it) and `@see` pointing at a real external URL that carries an outside fact.
- Keep a one-line note where a type is deliberately wider or narrower than reality and the caller must know.
- TSDoc on a published package's public API: still one line, still must pass the earn test. Being published is not an exemption.
- React components: props are documented by the props type. A comment above a component restating its name is a deletion.
- `// eslint-disable-next-line <rule>` — the rule name is required, and one line saying **why** is earned, because the reason is an outside fact.

## Python

Docstrings are runtime objects (`__doc__`, `help()`, Sphinx), so they are not purely decorative — but the earn test still governs.

- A public library API whose docstring is the shipped documentation: allowed, kept to the budget. Say what a caller cannot infer, not what the signature shows.
- Internal functions, private methods, most application code: zero.
- Type hints replace `:param x: the x`. Never write both.
- Never a docstring that repeats the function name in prose.

```python
# Good
def settle(amount: Decimal) -> Decimal:
    """Rounds half-up to match the processor; half-even breaks reconciliation."""

# Delete
def settle(amount: Decimal) -> Decimal:
    """Settle the amount.

    Args:
        amount: The amount to settle.
    Returns:
        The settled amount.
    """
```

## Swift

- `///` doc comments follow every rule above. Being `public` earns nothing.
- `// MARK:` is file organisation and is fine — but never as a heading introducing a prose block, and never as a decorative divider.
- Access control, `throws`, and optionality are in the signature. Do not restate them.
- Earn a line for: main-thread requirements, retain-cycle constraints, an Apple/SDK quirk, App Store rules, vendor SDK behaviour (StripeTerminal and friends).

## Terraform / HCL

`#` only — never `//` or `/* */`.

This is where earned comments are densest, because infrastructure encodes decisions with no other home: cost, quota, vendor limitation, compliance. It is also where the worst noise lives.

```hcl
# Good — outside facts, one line each.
# GKE telemetry off: metrics go to HyperDX, managed collector is ~$40/node/mo.
# us-east-1 only — the vendor has no endpoint in our primary region.
# 30s: the upstream LB caps idle connections at 35s.

# Delete — restates the argument.
# requests 500m of CPU
resource_requests = { cpu = "500m" }
```

- `description` on a `variable` or `output` is a field, not a comment. Fill it when the name is not self-evident, keep it one line, and do not duplicate it as a `#` comment above.
- `lifecycle { ignore_changes = [...] }` earns a line naming the external system that owns the drift.
- A pinned version earns a line only when the pin is a workaround for a named bug, not merely "pin for stability".

## YAML / Kubernetes / Dockerfile

- Keys are self-describing. `# the replica count` above `replicas: 3` is a deletion.
- Earn a line for: why a limit has that value (measured, quota, vendor), why an image is pinned to a specific digest, why an ordering or `dependsOn` exists, a workaround for an upstream bug with its issue link.
- Dockerfile: `RUN` chains earn a line when a step exists for a non-obvious reason (a CVE fix, a cache-busting trick, a base-image quirk) — never to narrate the command.

## SQL / migrations

- Never narrate DDL. `-- create the users table` is a deletion.
- Earn a line for: why an index exists and the query it serves, why a column is denormalised, why a constraint is deferred, a lock or downtime implication of the migration, a retention or compliance rule.
- Irreversible migrations earn a line saying so. That is a genuine caller contract.
