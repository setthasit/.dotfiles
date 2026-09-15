# Findings and Plan Drift

## Finding disposition — who acts

Almost no review comes back empty. Every axis' findings — Standards, Spec, Tester, Designer — run through this table together, still labelled by axis. It exists because "it is only a small fix" is how the orchestrator ends up writing code.

| Finding | Who acts |
|---|---|
| Blocking: wrong behaviour, `Done when` not met, security, regression | Writer, revived with `hub send`, findings forwarded **verbatim** |
| Non-blocking nit inside the diff: comment to delete, name, dead branch, missing test case | Same writer, same `hub send`, batched with the blocking ones — never a self-fix |
| Tester: a `Done when` line it could not observe on the surface, or a dead control, silent failure, or missing empty/error state | Writer, same `hub send`, with the tester's steps and evidence forwarded verbatim |
| Tester could not exercise the surface at all — no device, no credential, needs a live service | Not a writer fix: `Unverified:` in the ledger, named in the report, and the user told what is unproven |
| Designer: a deviation from the design source, a hand-rolled value where a token exists, a missing state, or an accessibility gap | Writer, same `hub send`, screen and evidence forwarded verbatim |
| Designer finding the *design source* never answered — a state or breakpoint nobody specified | Not a writer guess: `## Ruling` in the ledger when the repo's pattern decides it, otherwise stop and ask |
| Changes a signature, adds a file, or moves logic between files | Writer, as a sized task: add it to the plan, then dispatch |
| Reveals the *task* was wrong, not the code | Stop. Fix the plan (below), then re-dispatch |
| Reveals a *requirement* was wrong | Stop. Run the change protocol in `skill://implementation-plan-requirement`, then fix the plan |
| Deliberately accepted as-is | `Accepted as-is:` in the ledger entry with the reason. Silence is not a decision |
| Third round on the same task | Dispatch the Diagnose spawn with the DIAGNOSE prompt: root cause is missing context in the prompt, a wrong requirement, or a stale plan. Then still delegate the fix |

**Forward verbatim.** Restating a finding requires reading the code to understand it — the exact spend this session must avoid. Copy the text under its `## Standards`, `## Spec`, `## Tester`, or `## Designer` heading, add the pointer, send. Two axes that disagree are both forwarded; the orchestrator does not pick a winner.

A yielded writer is still addressable: `hub send` to its agent name (`hub list` for the roster). Gone → fresh writer dispatch, same agent type, with the FIX FORWARD prompt and the pointer blocks it names.

## Plan drift

The plan is a hypothesis written before the code existed.

| Situation | Action |
|---|---|
| Task already implemented | Spec reviewer confirms `Done when` holds → tick, log, move on |
| Plan references files or APIs that do not exist | Stop. Report. Propose the corrected task. Wait |
| Better approach found mid-task | Stop before writing. State the trade-off. Get the call. Record it in the plan and as a `## Ruling` |
| Ambiguous requirement or hidden decision (schema, contract, rounding, authz) | Ask. Never guess on data or security semantics |
| New required work discovered | New task in the plan, not smuggled into the current one |
| Task is really three tasks | Split it in the plan first, then execute the first |
| Shared helper must be extracted first | Own task, sequenced before its consumers |
| A writer reports it needs a file another batched leaf owns | Both leaves' `Files` were wrong: stop the batch, fix `Files` and `Blocked by` in the plan, re-dispatch serially |
| A leaf's `Blocked by` edge turns out not to exist | Drop the edge in the plan, so the next resume can batch it |
| Bug in code outside the task | `## Found` in the ledger. Own fix with a regression test, never folded into a feature task |
| Requirement changed after approval | Change protocol: `## Ruling` in the ledger, `requirements.md` change log, affected pending tasks edited, affected done tasks get a `Reconcile` task |
| Intent changed or most of the scope moved | New requirements and new plan. Do not patch a document whose goal is gone |

A stale plan is worse than no plan — it is what the next session wakes up to. Every decision that changes the plan edits the plan.
