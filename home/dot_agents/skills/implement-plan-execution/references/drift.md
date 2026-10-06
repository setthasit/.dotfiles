# Findings and Plan Drift

## Finding disposition - who acts

Classify and score through the `clean-code` skill's Review Scoring reference before routing. Preserve axis labels and finding IDs. The coordinator never applies fixes.

| Finding | Who acts |
|---|---|
| Blocking: wrong behaviour, `Done when` not met, security, regression | Writer, resumed by message, findings forwarded **verbatim** |
| Material or minor concern, task below acceptance | Select substantive findings sufficient to pass. Forward selected findings verbatim to the same writer. Record the rest |
| Minor concern or nit, task accepted | `Accepted as-is:` with level, deduction, and reason. Close out by default. Optional polish only through `references/notes-round.md` |
| Non-blocking note that asks for behaviour no scenario states | Not a nit and not a writer fix: `## Found - spec gap` in the ledger, reported. The spec owner decides |
| Tester: a `Done when` line it could not observe on the surface, or a dead control, silent failure, or missing empty/error state | Writer, same message, with the tester's steps and evidence forwarded verbatim |
| Tester could not exercise the surface at all: no device, no credential, needs a live service | Not a writer fix: `Unverified:` in the ledger, named in the report, and the user told what is unproven |
| Design review: visual deviation, token use, state, or accessibility finding | Explicit requirement or broken user path → blocker. Otherwise classify by impact and route according to task acceptance |
| Design review finding the *design source* never answered: a state or breakpoint nobody specified | Not a writer guess: `## Ruling` in the ledger when the repo's pattern decides it, otherwise stop and ask |
| Changes a signature, adds a file, or moves logic between files | Writer, as a sized task: add it to the plan, then dispatch |
| Reveals the *task* was wrong, not the code | Stop. Fix the plan (below), then re-dispatch |
| Reveals a *requirement* was wrong | Stop. Run the change protocol in the `implementation-plan-requirement` skill, then fix the plan |
| Deliberately accepted as-is | `Accepted as-is:` in the ledger entry with the reason. Silence is not a decision |
| Third failed review on the same task: decision FIX or BLOCKED, as the skill defines it | Dispatch the Diagnose spawn with the DIAGNOSE prompt: root cause is missing context in the prompt, a wrong requirement, or a stale plan. Then still delegate the fix |

**Forward selected findings verbatim**, under their original axis headings. Include all gate failures. Resolve disputed evidence or levels with judges before arithmetic. Preserve duplicate mappings in the ledger. Acceptance never deletes a deduction or hides a finding.

A finished writer is still addressable: message it by its agent name or ID, and list the agents for the roster. Gone → fresh writer dispatch, same agent type, with the FIX FORWARD prompt and the pointer blocks it names.

## Plan drift

The plan is a hypothesis written before the code existed.

| Situation | Action |
|---|---|
| Task already implemented or committed without recorded acceptance | Earned reviewers verify the implementation and coverage before coordinator acceptance. Forward a recorded commit diff when available, otherwise name implementation paths as review scope. Prompts use that scope instead of assuming an unstaged diff. Tick only after the same close-out gate |
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
| Intent changed or most of the scope moved | New requirements and new plan. Do not patch a document whose goal is gone |

A stale plan is worse than no plan. It is what the next session wakes up to. Every decision that changes the plan edits the plan.
