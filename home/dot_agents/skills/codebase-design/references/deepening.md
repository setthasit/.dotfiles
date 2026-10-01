# Deepening a Shallow Module

Reached from `SKILL.md` when a module is shallow, or when its dependency makes callers hard to test.

Order:

1. Run the deletion test on every module in the chain. Pass-throughs go first — they often remove the problem outright.
2. Classify the dependency below. The category decides whether a seam is needed at all.
3. Collapse the survivors into one module whose interface is only the calls the callers actually make.
4. Move the tests to that interface and delete the old ones.

## Dependency categories

| Category | Examples | Seam | Test strategy |
|---|---|---|---|
| **1. In-process** | pure logic, parsing, formatting, in-memory state | None. No adapter, no interface, no injection — always deepenable | Call the interface directly. No doubles |
| **2. Local-substitutable** | filesystem, embedded DB (SQLite `:memory:`), clock, subprocess | Stays internal: a constructor argument or build-time choice, never a published port | Run against the real stand-in — tmpdir, in-memory DB, fixed clock |
| **3. Remote but owned** | our own HTTP/gRPC service, our queue, our cache | Ports and adapters, one port at our edge | In-memory adapter for tests, real transport in production, one integration test on the real transport |
| **4. True external** | payment provider, SMS gateway, third-party OAuth | Injected port. The vendor SDK appears in exactly one adapter and nowhere else | Mock adapter for unit tests; the vendor's own sandbox for the contract test |

Pick the lowest category that is honest about the dependency. Treating a category 1 or 2 dependency as category 4 is how a codebase ends up with twelve interfaces that each have one implementation and one mock.

A category changes when the dependency does, not when a test gets awkward. An awkward test against a category 2 stand-in is a signal the interface is wrong, not that a port is missing.

## Replace, don't layer

Once interface-level tests exist at the deepened module, delete the old shallow-module unit tests. Keeping both re-pins the implementation you just finished hiding: the next change fails tests that assert nothing a caller can observe, and the deepening is reverted to make them pass.

An old test covering a case the new interface tests miss → port the case to the new interface, then delete the old file. Never keep the file "for coverage".

## Worked example

Three shallow modules, and a seam that leaked an interface into every test.

```
order/handler.ts     calls priceCalculator.compute(order)
order/price.ts       calls taxRules.lookup(order.region), then multiplies
order/tax-rules.ts   calls TaxRepo.findByRegion(region)   ← interface, one implementation
```

What a caller had to know: twelve exports across three files, that `compute` throws on an unknown region, and that `TaxRepo` must be wired — so three test files each built a mock repo. `price.ts` contributed one multiplication.

Deletion test: delete `price.ts` and its multiply lands in one caller, nothing else changes — pass-through. Delete `tax-rules.ts` and its lookup lands there too. Both fail.

Dependency: the tax table ships in-repo and is loaded from a file. Category 2, so the seam stays internal and `TaxRepo` was never earning its injection point.

```
order/pricing.ts     priceOrder(order): Priced | Unpriced
                     internal: region lookup, tax table load, half-up rounding
```

Tests: `price.test.ts` and `tax-rules.test.ts` deleted — they asserted a multiplication and that a lookup was called. `pricing.test.ts` asserts what a caller sees: a known region prices correctly, an unknown region returns `Unpriced.NoTaxTable` instead of throwing, and rounding matches the recorded half-up case.

Net: three files and two mock repos became one file, one entry point, no doubles, and the rounding rule stopped being observable from outside.
