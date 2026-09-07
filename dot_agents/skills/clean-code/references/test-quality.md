# Test Quality

Bar: a test defends an observable contract and fails on a plausible bug. Below are the shapes that pass review and never go red.

## The tautological test

The expected value is computed with the expression under test, so a bug in that expression is copied into the assertion.

```ts
// Tautology — mirrors the reduce in cartTotal; green for every implementation
const expected = items.reduce((s, i) => s + i.price * i.qty, 0);
expect(cartTotal(items)).toBe(expected);
```

```ts
// Real — literal worked out by hand; a wrong reduce turns it red
expect(cartTotal([{ price: 250, qty: 2 }, { price: 99, qty: 1 }])).toBe(599);
```

Same disease, other spellings: rebuilding the expected string from the same template, `expect(x).toBe(x)`, and snapshotting output of the path under test then re-blessing the snapshot when it changes.

## The implementation-coupled test

Asserts how the unit works, so a correct refactor goes red and a behaviour change can stay green.

```ts
// Coupled — an internal call, and state read around the interface
expect(repo.save).toHaveBeenCalledTimes(1);
expect((service as any).cache.size).toBe(1);
```

```ts
// Observable — what any caller can see through the same interface
await service.register("a@b.c");
expect(await service.find("a@b.c")).toMatchObject({ status: "active" });
```

Assert return values, thrown errors, and state readable through the public interface. A call count is worth asserting only when the count *is* the contract: idempotency, charge-exactly-once, cache prevents the second network call.

## Mocking

| Dependency | Rule |
|---|---|
| Third-party API, network, clock, randomness, filesystem outside a temp dir | Mock or inject a fake — this is the system boundary |
| Your own modules | Never. Needing to means the dependency should have been injected, or the module was cut at the wrong place: `skill://codebase-design` |
| Anything with a real in-process stand-in | Use the real thing: in-memory store, embedded SQLite, `tmpdir`, local test server |

A real stand-in fails when your usage is wrong. A mock agrees with you.

### Mock shape

One object per collaborator endpoint, returning a canned response:

```ts
const gateway   = { charge: async () => ({ id: "ch_1", status: "succeeded" }) };
const declining = { charge: async () => ({ id: "ch_2", status: "failed" }) };
```

Not one generic mock branching on its arguments:

```ts
const gateway = { charge: async (r) => (r.amount > 1000 ? { status: "failed" } : { status: "succeeded" }) };
```

A mock with an `if` in it is a second implementation of the collaborator, and nobody tests it.

## Agree the seam before the first test

Name the public boundary the test drives — HTTP handler, exported function, CLI invocation — before writing it. Not obvious → ask the user, naming the boundary you would pick and why. A test written at the wrong seam is deleted and rewritten, never patched into place.

**Replace, don't layer.** A test moves up to a wider interface → delete the narrower tests it now subsumes. Two levels covering one behaviour means two rewrites for every change and one of them will be skipped.

## Fails-before-fix

A regression test never observed red proves nothing.

1. Write the test from the reported symptom.
2. Run it against the unfixed code. It MUST fail, and the failure must name the real symptom, not a setup error.
3. Fix. Re-run. Green.

It cannot be run red (needs the fix to compile, or a fixture hides the bug) → the test is at the wrong seam. Go back.
