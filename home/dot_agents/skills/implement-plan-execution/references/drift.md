# Findings and Plan Drift

## Who acts on a finding

Score with `references/scoring.md`. Route by its decision. Keep each finding's axis heading and ID wherever it goes. The coordinator never applies a fix.

| Finding | Who acts |
|---|---|
| Selected by a FIX or BLOCKED decision | Writer, resumed by message with the FIX FORWARD prompt in `references/fix-round.md`, findings verbatim under their axis headings, every gate failure included |
| Asks for behaviour no scenario states | Not a writer fix: `## Found - spec gap` in the ledger, reported. The spec owner decides |
| Tester: a `Done when` line it could not observe on the surface, or a dead control, silent failure, or missing empty or error state | Writer, same message, with the tester's steps and evidence verbatim |
| Tester could not exercise the surface at all: no device, no credential, needs a live service | Not a writer fix: `Unverified:` in the ledger, named in the report, and the user told what is unproven |
| Design review: visual deviation, token use, state, or accessibility | Explicit requirement or broken user path → blocker. Otherwise its level decides, like any finding |
| Design review on a state or breakpoint the design source never answered | Not a writer guess: `## Ruling` in the ledger when the repo's pattern decides it, otherwise stop and ask |
| Changes a signature, adds a file, or moves logic between files | Writer, as a sized task: add it to the plan, then dispatch |
| Shows the *task* was wrong, not the code | Stop. Fix the plan (below), then re-dispatch |
| Shows a *requirement* was wrong | Stop. Run the change protocol in the `implementation-plan-requirement` skill, then fix the plan |
| Third failed review on one task | `SKILL.md` step 4 |

## Plan drift

The plan is a hypothesis written before the code existed.

| Situation | Action |
|---|---|
| Task already implemented or committed without recorded acceptance | The judges its **Role → agent** rows call for verify the implementation and coverage before acceptance. Their scope is the recorded commit diff when there is one, otherwise the named implementation paths, never an assumed unstaged diff. Tick only after the same close-out gate |
| Plan references files or APIs that do not exist | Stop. Report. Propose the corrected task. Wait |
| Better approach found mid-task | Stop before writing. State the trade-off. Get the call. Record it in the plan and as a `## Ruling` |
| Ambiguous requirement or hidden decision (schema, contract, rounding, authz) | Ask. Never guess on data or security semantics |
| New required work discovered | New task in the plan, not smuggled into the current one |
| Task is really three tasks | Split it in the plan first, then execute the first |
| A new task, split, `Reconcile`, or ship-review task pushes a part past six leaves | Move whole parent tasks with no `[x]` leaf to the next part, cascading forward, never one leaf of a parent. No next part → add one after the last. A parent over six leaves → split it into two parents first. A plan without parts gains part headings. Write or edit the `Ends with:` line of every part that changed. No room left in part 3 → the next row |
| A fourth part would be needed | Stop and ask: the phase is two features. Split it in the plan with the user's approval |
| Shared helper must be extracted first | Own task, sequenced before its consumers |
| A writer reports it needs a file another batched leaf owns | Both leaves' `Files` were wrong: stop the batch, fix `Files` and `Blocked by` in the plan, re-dispatch serially |
| A leaf's `Blocked by` edge turns out not to exist | Drop the edge in the plan, so the next resume can batch it |
| Bug in code outside the task | `## Found` in the ledger. Own fix with a regression test, never folded into a feature task |
| Requirement changed after approval | Change protocol: `## Ruling` in the ledger, `requirements.md` change log, affected pending tasks edited, affected done tasks get a `Reconcile` task |
| Intent changed or most of the scope moved | New requirements and new plan. Never patch a document whose goal is gone |

Every decision that changes the plan edits the plan.
