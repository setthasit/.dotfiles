---
name: diagnosing-bugs
description: Use when debugging a hard bug, a flaky or intermittent failure, a performance regression, or any "why is this happening" / "cannot reproduce" / root-cause request. Six gated phases: build a command that goes red on this bug before reading any code, minimise the repro, rank falsifiable hypotheses, instrument, pin the fix with a regression test, then clear the scaffolding.
---

# Diagnosing Bugs

The bug is found by the loop, not by the reading. Phase 1 is the skill; Phases 2-6 are mechanical once it exists.

## Phase 1 — a command that goes red on this bug

**Gate: no red-capable command, no Phase 2.** Not "next step", not "in parallel". Stop here until it exists.

Reading code to build a theory before the command exists is the failure this phase prevents. A theory no run can contradict survives every contrary fact, and the session becomes plausible narration ending in a fix nobody can show works.

Completion criteria — all four, checked by having run it:

- [ ] **Red-capable** — it fails on the user's exact reported symptom: same error, same wrong value, same status code, same latency. "Runs without erroring" is not red-capable; it proves only that the happy path exists.
- [ ] **Deterministic** — same result every run. Flaky bug → the loop *is* the command (`for i in $(seq 50); do …; done`), and the failure rate is the signal you are minimising.
- [ ] **Fast** — seconds. A 4-minute loop is 12 experiments per hour and stops being run.
- [ ] **Agent-runnable** — you run it, unattended, whenever you want. No human clicking.

Then paste the run: the command, and the output showing the symptom. Secrets `<REDACTED>`.

### Techniques, cheapest first

| Technique | How | Fires when |
|---|---|---|
| Failing test in the repo's own runner | the project's runner, one test id (`go test -run`, `pytest -x -k`, `vitest -t`) | the code is already under test |
| Direct HTTP request | `bash` + `curl`, or a service under `hub` `op:"start"` | the symptom is an endpoint response |
| CLI output diff | `bash`: run, `diff` against expected output | the symptom is a wrong stdout, exit code, or written file |
| Headless browser | `eval` + `browser.open`, then `tab.observe` / `tab.evaluate` | the symptom only appears in rendered UI or client JS |
| Log or trace replay | `read`/`grep` a captured log; feed the recorded payload back through the handler | production failed and you have the record but not the trigger |
| Throwaway harness script | `write` a script that calls the suspect unit directly | no seam exists to reach the unit from a test |
| Property or fuzz search | a loop over generated inputs, asserting the invariant | the trigger input is unknown |
| `git bisect` | `bash`: `git bisect start <bad> <good>` + `git bisect run <cmd>` | it worked before and the red command runs at old commits |
| Differential comparison | run the same input against the known-good version, env, or reference impl; diff | "works on mine", one env, or one version only |
| Human-in-the-loop script | `assets/hitl-loop.sh` | last resort — a human must click something no tool drives |

Cheap rows do not fit, or you reach bisect / fuzz / differential / human-in-the-loop → `references/feedback-loops.md` for the right-when, the exact command, and each one's failure mode.

## Phase 2 — minimise

Re-run the Phase 1 command after every cut. Remove one thing at a time: one input field, one config value, one call, one middleware, one dependency.

**Finish condition**: removing anything else makes the bug disappear. Every element still standing is load-bearing, and that set is the shape of the cause.

## Phase 3 — hypothesise, then checkpoint

3-5 ranked hypotheses, each written as: **if X is the cause, then _this specific change_ makes the bug disappear.**

> If the cache key omits the tenant id, then hardcoding the tenant into the key makes the cross-tenant 403 disappear.

A statement no experiment can falsify is not a hypothesis — rewrite it until an experiment can, or drop it. "Something in the auth layer" is not a hypothesis.

Present the ranked list to the user before testing any of them. Then test in rank order, cheapest falsification first.

## Phase 4 — instrument

| Order | Tool |
|---|---|
| 1. Debugger or REPL | `xd://debug` (breakpoints, stepping, `evaluate`, frame variables); a REPL or live process under `hub` `op:"start"` |
| 2. Targeted logging | the two or three frames the hypotheses actually name — values in, values out, branch taken |
| 3. Never | "log everything and grep". It buries the signal and the cleanup is unbounded |

Every temporary log line carries a unique prefix `[DEBUG-<tag>]`, so removal is one grep and never a judgement call.

**Performance branch**: measure first — a profiler, or a timing harness around the suspect call. Record the before number; without it the after number means nothing. Then bisect the measurement: halve the workload or the call path until the cost localises to one frame. Never optimise anything unmeasured; the hot spot is somewhere you did not guess.

## Phase 5 — fix and pin it

Write the regression test before the fix **only when a correct seam exists**: one that exercises the real bug pattern at the actual call site.

- No correct seam → that is itself a finding. Report the missing seam as a design problem; do not test through a fake seam that passes while the bug ships. Seam, boundary, and depth vocabulary: `skill://codebase-design`.
- The test must fail before the fix and pass after. Impractical → a smoke test plus an explicit statement of what stays unverified.
- Never make it pass by deleting, skipping, or loosening an assertion.
- The fix's own quality: `skill://clean-code`.

## Phase 6 — cleanup gate

- [ ] The original Phase 1 command re-run, now green
- [ ] The regression test passes
- [ ] `grep` for `[DEBUG-` returns nothing
- [ ] Every throwaway harness deleted — or captured deliberately: a prototype worth keeping goes on its own throwaway branch with a pointer in the report, never left loose in the working tree
- [ ] The commit message names the root cause, not the symptom ("tenant id missing from cache key", not "fix 403s")

## Stop and ask

The reproduction needs a destructive action (drop, truncate, delete, force push), a migration, production data, or credentials you must not read → stop. Name what the loop needs, why, and the safest alternative you can see. Do not improvise around the restriction.

## Redaction

Never open `.env` or any credential file; `.env.example`, README, compose files, and CI workflows are fine. Any output you paste — logs, headers, env dumps, tracebacks, connection strings — has its tokens, keys, and passwords replaced with `<REDACTED>` first.
