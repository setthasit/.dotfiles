# Code Review Judge Lists

The TASK REVIEW prompt in `references/task-review.md` points its judge at both lists. Spec comes first.

## SPEC

```
1. `Done when`: every line holds, with the evidence in the diff, in a test, or in a claimed command you checked. Missing evidence is a FAIL, not a note
2. Scenarios served: each has a test or an observed behaviour that would fail if the behaviour regressed. Name the test or behaviour per scenario
3. Silent narrowing: a case, error path, or input the scenario states that the diff handles by ignoring it, TODO-ing it, or asserting less than the scenario says
4. Unasked behaviour: anything no `Done when` line and no scenario requires: extra options, retries, caching, abstraction for a caller that does not exist
5. Must not break: an existing caller, contract, or data shape the diff changes without the task asking for it
6. Tests assert the scenario's real values, not a restatement of the implementation
```

## STANDARDS

```
1. Repo conventions: layering, DI, error handling, logging, i18n, naming, file placement. The nearest existing sibling file is the standard, never your preference
2. Clean code: load the `clean-code` skill and apply it: duplication of a helper that already exists, dead code, speculative abstraction, unclear names
3. Comments: apply the clean-code earn test and caps. Classify violations by consequence. A redundant comment can be a nit. A misleading safety contract can be a blocker
4. Tests: assert real values (never "no throw") and cover the new branches. No test made green by deletion, a skip, or a loosened assertion
5. Code smells, fixed baseline: a function doing two jobs, a boolean parameter selecting behaviour, a swallowed error, a magic number or string, nesting past three levels, shared mutable state, an unhandled nil, empty, or boundary input
6. Regression risk: existing callers, public API, persisted data shape, migrations
7. Security: judge against the `application-security` skill
8. Files: nothing touched outside the task's Files line
9. Plan hygiene: no plan file in the diff, and no plan filename, task ID, phase number, requirement ID, or "see the plan" anywhere in it
```
