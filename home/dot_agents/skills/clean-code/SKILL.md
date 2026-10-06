---
name: clean-code
description: Use when writing, modifying, or reviewing code in any language, or any comment: inline, header, doc comment (godoc, JSDoc, docstring, rustdoc), config. Covers reuse-before-write search, DRY, KISS/YAGNI, SOLID, naming, triaging existing violations, and a zero-default comment policy with an earn test and hard budgets. Fires on adding a helper, refactoring, a comment-heavy file, or a doc linter.
---

# Clean Code

**Two duties, every task**: new code obeys every rule here on the first pass, with no cleanup round. Existing code that breaks one gets fixed or reported, never ignored. See [Existing Violations](#existing-violations).

**Discipline**: search before write · extract before duplicate · simplify before abstract · refactor before explain. A violation is a symptom. A misleading comment means the code is unclear. A flag parameter means the design is wrong. Fix the cause, not the surface.

**Writing and reviewing differ.** A writer obeys every rule here. A reviewer levels each finding by impact with `references/review-scoring.md`, and that level decides what blocks acceptance. The level never lowers what a writer aims for. Safety and explicit task requirements always block.

## Before Writing Anything: SEARCH → REUSE → EXTEND → CREATE (in order, fall through only when a step fails)

| Step | Rule |
|---|---|
| **1. SEARCH** (never skip) | Grep domain keywords (`validate`, `format`, `parse`, `calculate`, the entity name) and similar signatures. Check `utils/ helpers/ common/ shared/ pkg/ lib/` and the siblings of the file you edit. Duplication lives nearby. Skipping ships duplicates |
| **2. REUSE** | A function already does the job → call it. Never copy its body, never write a slightly different local version |
| **3. EXTEND** | Does 80% of the job? Add a parameter or small variant **only if** its purpose stays single and clear. Never bolt unrelated behavior on. Would become a multi-purpose blob → new function sharing the common core |
| **4. CREATE** | Place it where the next person would look: same file → module helper → project-wide shared location, narrowest scope covering all callers. Group by domain (`price.ts`, `validation/order.go`), never a global `utils` grab-bag. One job, clear name, few parameters |

## DRY

| Situation | Action |
|---|---|
| Same logic in 2+ places (now, or by the end of this change); a repeated validation/permission/formatting check; a block you are about to copy-paste | Extract one shared function first, then replace every call site. Never inline-duplicate "for now". The extraction has one purpose and a name that says it; needing a boolean flag to behave two ways means it is two functions |
| Two functions with near-identical bodies | Merge into one, parameterize the difference |
| Similar-looking code with DIFFERENT business reasons | Leave separate. Accidental similarity is not duplication |

## KISS / YAGNI

- Simplest solution that meets the ACTUAL requirement
- No speculative abstraction: no single-implementation interface, no unrequested config option, no generic engine for one case, no layer "for the future". Reusable ≠ abstract. A small, well-named, well-placed concrete function is reusable. A premature framework is not
- **DRY vs YAGNI**: extract when duplication is REAL (exists now, or lands in this same change). Never pre-build machinery for hypothetical callers

## Clarity Over Cleverness

**Reader test**: a developer new to the file follows every line in one read. A line that needs a second look fails, however short or fast it is. Fewer lines win only when the reader also spends less effort.

| Clever → rewrite | Clear |
|---|---|
| Nested ternary, chained comprehension, one line doing three things | Named intermediate values, an `if`, a plain loop |
| `cond && doThing()` as a statement, implicit type coercion, leaning on operator precedence | An explicit `if`, an explicit conversion or comparison, parentheses |
| Bit tricks, a regex where a string method or a real parser does the job | The obvious operation, `startsWith`, the parser |
| Metaprogramming, reflection, monkey-patching, a decorator or macro that hides control flow | A direct call the reader can follow with go-to-definition |
| A rare language feature or a pattern foreign to this codebase | The idiom the surrounding code already uses |
| Hand-tuned optimization with no measurement behind it | The straightforward version. Optimize only where a benchmark shows the need |

## SOLID

| Principle | Practical rule |
|---|---|
| **S**ingle Responsibility | One function = one job; one module = one reason to change. Describing it needs "and" → split it |
| **O**pen/Closed | Extend by adding new code (new case, new implementation), not by piling branches into stable code |
| **L**iskov Substitution | Implementations honor the interface contract: no surprise throws, no ignored parameters |
| **I**nterface Segregation | Small focused interfaces. Consumers depend only on what they use |
| **D**ependency Inversion | Depend on abstractions at real module boundaries; inject dependencies. No boundary → no abstraction |

## Self-Documenting Code

- Names state intent: `isEligibleForRefund(order)`, not `check(o)` or `flag2`. Booleans read as questions: `hasAccess`, `isExpired`, `canRetry`
- Named constants over magic values: `MAX_RETRY_COUNT`, not `3`
- Complex conditional → named function: `if (isPeakHour(t))`, not `if (t.h >= 17 && t.h <= 19 && !t.weekend)`
- Guard clauses and early returns over nested if-pyramids
- Functions short enough to read top to bottom without scrolling

## Structure and Modularity

- Follow the project's existing structure and layer boundaries. Consistency beats personal preference. A "better" pattern in one file makes the codebase worse overall
- New code goes in the module that owns the concern, not wherever the current file happens to be
- Dependencies point one direction. No import cycles. Small modules, explicit public surface, private internals
- Structure genuinely bad → fix it as a deliberate refactor step, never as a drive-by inside a feature change

Line-level rules live here. Where a boundary goes (interface depth, seam placement, what a module hides): the `codebase-design` skill.

## Tests

Writing or reviewing a test, or choosing what to mock: [references/test-quality.md](references/test-quality.md).

# Comments

**Default: ZERO. Write the code so it does not need one.** A comment is unchecked by the compiler, uncovered by tests, and stale the moment the code moves. It has to pay for that.

**Doc comments are comments.** godoc, JSDoc, TSDoc, docstrings, KDoc, rustdoc, XML doc, Swift `///`. Every rule here applies to them unchanged. "It's the public API", "it's the convention", "the linter wants one" are NOT exemptions. Per-language conventions, and how to handle a linter that demands one: [references/comments-by-language.md](references/comments-by-language.md).

## The earn test: all four, or delete

1. **Not derivable.** The fact is not recoverable from names, types, signature, tests, or `git log`. Only two things qualify:
   - **Outside fact**: a regulation, a vendor or protocol quirk, an upstream bug, a measured cost or benchmark, a contract with another team, a trade-off and its concrete consequence.
   - **Caller-facing contract the signature cannot carry**: a unit, an ordering guarantee, an idempotency or concurrency rule, what nil/empty means, what the caller must not do.

   Design rationale is neither. Neither is anything you learned by reading the file.

2. **Load-bearing.** Delete it and ask: does someone now write a bug? No → it stays deleted. "A reader might find it interesting" is not load-bearing.
3. **True today.** What the code does now. Not what it will do, used to do, or what you wish it did.
4. **Within budget.** Does not fit → it was never a comment, it was a design doc.

## Budget: hard caps

| Kind | Cap |
|---|---|
| Inline, inside a function | **1 line** |
| Doc comment on a symbol | **2 lines** |
| File / package / type header | **5 lines**, and only when the file's job is not obvious from name + path |
| Any comment, ever | one paragraph: no bullet lists, no sub-headings, no multi-section prose |

Caps are ceilings, not targets. **Most symbols get zero**. A file where every exported symbol carries a doc comment has not been triaged, and repeatedly hitting the cap means the code is unclear, not that the file needs more prose. **File-level trigger:** comment lines above ~10% of the file → re-run the earn test on every one and delete everything that fails. A re-triage trigger, not a quota: a short config file where five genuine one-line outside facts exceed 10% is fine; 60% is an essay filed in the wrong place.

## Banned outright

| Pattern | Example of the disease |
|---|---|
| Restating the signature, name, or type | `// Close releases the store's resources.` above `Close() error` |
| Narrating the "what" | `// loop over users and sum balances` |
| Design narration / architecture essay | "the contract is deliberately backend-neutral", "fusion lives in the service layer". A design doc wearing a `//` |
| Future or aspirational notes | "lands in a later change-set", "for now", "until X ships", "grows additively" |
| Apologising for the code | "this is ugly because…". Fix it, or stay silent |
| Alternatives not taken | unless that alternative caused a named, concrete failure |
| Restating a rule the code enforces | `// must be non-nil` above a nil check |
| Decorative banners, dividers, ASCII art | `// ===== HELPERS =====` |
| Changelog, attribution, "added by", dates | git owns this |
| Commented-out code | git owns this |
| TODO/FIXME without an owner **and** ticket id | do it, delete it, or raise it to the user |
| Param/return blocks echoing the signature | `@param id The id` |
| Anything the type system already enforces | `// callers never see transactions or rowids` |

## Before you write one: in order

1. Rename the thing until the comment is redundant
2. Extract the confusing block into a named function
3. Introduce a named constant or typed value that states the rule
4. Flatten it: guard clause, early return, split the function
5. Still needed **and** passes all four earn tests → write ONE short line. Steps 1–4 succeed far more often than agents assume; do not skip to 5

Worked keep/delete examples, and the procedure for auditing a comment-heavy file: [references/comment-calibration.md](references/comment-calibration.md).

**Real prose belongs somewhere else.** Design rationale, contract philosophy, layering decisions, and migration plans are genuinely valuable. They do **not** live in a source file. They go in the design doc, the ADR, the PR description, or the README. Want to write one → say so in your report and ask where it goes. Never smuggle it in as a doc comment.

# Existing Violations

Spot one while writing, editing, or reading → triage it. Never walk past silently. Surrounding code being wrong is never permission for new code to be wrong.

| Where the violation sits | Action |
|---|---|
| In code you are writing now | Fix before finishing. No exceptions |
| In the lines you are already editing | Fix now. It is in scope |
| Nearby, small and safe (one name, one duplicate, one dead branch) | Fix only when it materially helps the current change. Otherwise report |
| Large, risky, or unrelated to the task | Do NOT fix silently. Report `file:line` + concrete proposal. Never mass-refactor inside a feature or bugfix change |

Symptom → root-cause fix table, and the rules for refactoring safely: [references/violation-triage.md](references/violation-triage.md).

## Before Declaring Done

- [ ] Searched before every new function. No duplicated logic left behind
- [ ] Simplest solution that meets the real requirement; no speculative abstraction; every function has one job and a name that says it
- [ ] Every line passes the reader test. No form from the Clarity Over Cleverness table survives
- [ ] Comment count as close to zero as the code allows. Every survivor passes all four earn tests and sits within budget
- [ ] No doc comment added because a symbol is exported or a linter asked. No design narration, future or "for now" note, restated signature, commented-out code, dead code, or ownerless TODO
- [ ] Prose worth keeping was reported and rehomed, not smuggled into the source
- [ ] New code placed where the next person would look; follows the project's structure
- [ ] Violations in touched code fixed in scope, or reported with `file:line`
- [ ] Change verified (tests/build run)
