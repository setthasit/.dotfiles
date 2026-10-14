---
name: diagnosing-bugs
description: Use when debugging a hard bug, a flaky or intermittent failure, a performance regression, or any "why is this happening" / "cannot reproduce" / root-cause request. Six gated phases: build a command that goes red on this bug before reading any code, minimise the repro, rank falsifiable hypotheses, instrument, pin the fix with a regression test, then clear the scaffolding.
---

# Diagnosing Bugs

## Phase 1: a command that goes red on this bug

**Gate: no red-capable command, no Phase 2.** Not "next step", not "in parallel". Stop here until it exists.

Do not read code for a theory before the Phase 1 command exists.

Completion criteria (all four, checked by having run it):

- [ ] **Red-capable**: it fails on the user's exact reported symptom (same error, same wrong value, same status code, same latency). "Runs without erroring" is not red-capable; it proves only that the happy path exists.
- [ ] **Deterministic**: same result every run. Flaky bug → the loop *is* the command (`for i in $(seq 50); do …; done`), and the failure rate is the signal you are minimising.
- [ ] **Fast**: seconds. A 4-minute loop is 12 experiments per hour and stops being run.
- [ ] **Agent-runnable**: you run it, unattended, whenever you want. No human clicking.

Then paste the run: the command, and the output showing the symptom, with every token, key, and password replaced by `<REDACTED>`.

Config the bug depends on: read `.env.example`, the README, compose files, and CI workflows.

### Techniques, cheapest first

| Technique | How | Fires when |
|---|---|---|
| Failing test in the repo's own runner | the project's runner, one test id (`go test -run`, `pytest -x -k`, `vitest -t`) | the code is already under test |
| Direct HTTP request | `curl`, against a service started as a background process | the symptom is an endpoint response |
| CLI output diff | `bash`: run, `diff` against expected output | the symptom is a wrong stdout, exit code, or written file |
| Headless browser | the browser tool: open the page, then read its snapshot or evaluate a script in it | the symptom only appears in rendered UI or client JS |
| Log or trace replay | read or grep a captured log; feed the recorded payload back through the handler | production failed and you have the record but not the trigger |
| Throwaway harness script | a script under `/tmp/agent/` that calls the suspect unit directly | no seam exists to reach the unit from a test |
| Property or fuzz search | a loop over generated inputs, asserting the invariant | the trigger input is unknown |
| `git bisect` | `bash`: `git bisect start <bad> <good>` + `git bisect run <cmd>` | it worked before and the red command runs at old commits |
| Differential comparison | run the same input against the known-good version, env, or reference impl; diff | "works on mine", one env, or one version only |
| Human-in-the-loop script | `assets/hitl-loop.sh` captures the trigger once. Build the agent-runnable command from what it captured | last resort: a human must click something no tool drives |

Cheap rows do not fit, or you reach bisect / fuzz / differential / human-in-the-loop → `references/feedback-loops.md` for the right-when, the exact command, and each one's failure mode.

## Phase 2: minimise

Re-run the Phase 1 command after every cut. Remove one thing at a time: one input field, one config value, one call, one middleware, one dependency.

**Finish condition**: removing anything else makes the bug disappear. Every element still standing is load-bearing, and that set is the shape of the cause.

## Phase 3: hypothesise

3-5 ranked hypotheses, each written as: **if X is the cause, then _this specific change_ makes the bug disappear.**

> If the cache key omits the tenant id, then hardcoding the tenant into the key makes the cross-tenant 403 disappear.

A statement no experiment can falsify is not a hypothesis. Rewrite it until an experiment can, or drop it. "Something in the auth layer" is not a hypothesis.

Put the ranked list in your report and continue without waiting. Test in rank order, cheapest falsification first.

## Phase 4: instrument

| Order | Tool |
|---|---|
| 1. Debugger or REPL | the language's debugger (breakpoints, stepping, evaluate, frame variables); a REPL or live process started in the background |
| 2. Targeted logging | the two or three frames the hypotheses actually name: values in, values out, branch taken |
| 3. Never | "log everything and grep". It buries the signal and the cleanup is unbounded |

Every temporary log line carries a unique prefix `[DEBUG-<tag>]`, so removal is one grep and never a judgement call.

**Performance branch**: measure first, with a profiler or a timing harness around the suspect call. Record the before number; without it the after number means nothing. Then bisect the measurement: halve the workload or the call path until the cost localises to one frame. Never optimise anything unmeasured; the hot spot is somewhere you did not guess.

## Phase 5: fix and pin it

Write the regression test before the fix, at a seam that exercises the real bug pattern at the actual call site.

- It must fail before the fix and pass after. The rule, and what to do when no seam reaches the bug: "Fails-before-fix" in the `clean-code` skill's test-quality reference.
- Seam, boundary, and depth vocabulary: the `codebase-design` skill.
- The fix's own quality: the `clean-code` skill.

## Phase 6: cleanup gate

- [ ] The original Phase 1 command re-run, now green
- [ ] The regression test passes
- [ ] `grep` for `[DEBUG-` returns nothing
- [ ] Every throwaway harness deleted, or captured deliberately: a prototype worth keeping goes on its own throwaway branch with a pointer in the report, never left loose in the working tree
- [ ] The commit message names the root cause, not the symptom ("tenant id missing from cache key", not "fix 403s")

## Stop and ask

The reproduction needs production data or a migration → stop. Name what the loop needs, and propose the safest stand-in you can see: a local copy, a recorded payload, a sandbox account.
