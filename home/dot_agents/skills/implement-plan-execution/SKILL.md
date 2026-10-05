---
name: implement-plan-execution
description: Use when executing an implementation plan — a `.plans/**/plan.md` or `phase-*.md` file, or any markdown task list with `- [ ]` checkboxes. Trigger on "execute the plan", "implement this plan", "continue the plan", "work through phase 2", or any request to start or resume work from a plan document.
---

# Implementation Plan Execution

Execute a checkbox plan in dependency order: **DISPATCH writers → DISPATCH the judging slots → ROUTE findings → CLOSE OUT**. Independent leaves are written in parallel and judged in parallel; findings, close-out, and commits stay per task, in plan order. A phase ends as one PR a human can review.

Load the `clean-code` skill and its Review Scoring reference. It owns acceptance gates, finding levels, and the task score. Verification commands come from the repo. Reviewers classify findings. The coordinator calculates acceptance and stops at PASS.

## Role: coordinator

The orchestrator is the longest-lived session in the run; every token it absorbs is paid on every remaining task. It coordinates, it does not execute.

**Allowed** — nothing else:

| Action | Scope |
|---|---|
| Read | plan files; `requirements.md` Goal, Non-goals, and Acceptance only; `progress.md` tail; subagent briefs and reports; review rubric; package manifests and CI config at setup |
| Edit | plan checkboxes and structural plan edits; `progress.md` |
| Spawn, message | dispatch and message subagents |
| Git | `status`, `log`, `diff --stat`, `checkout -b`, `add <explicit files>`, `commit` |

Everything else is a spawn: reading a source or test file, running a test, lint, build, or the app, diagnosing a failure, reviewing a diff, fixing a finding. Reaching for one of those is the signal that a dispatch was skipped.

**After a dispatch, stop.** No reads, no edits, no commands while any writer, reviewer, tester, design reviewer, or scout is running. Wait for every report in flight.

**Pointers, not payloads.** The plan's `Read first` lines are the pointers; forward them. Missing or stale → `scout` brief ≤25 lines, never a hunt in this session. Reports are capped: writer ≤20 lines, each reviewer, tester, and design reviewer ≤15 plus one line per finding, scout ≤25. A judge never drops a finding to fit. Read a finished subagent's returned report; never re-read the code to reconstruct what it did.

## Role → agent

Every dispatch picks its spawn from this table. It is the only place agent types are chosen; the prompts, setup, and ship references point here.

| Role | Spawn | Chosen when |
|---|---|---|
| Writer | `task` | default for a leaf task — reads the repo, writes code and tests, runs the suite |
| Writer, visual | `uxui-designer` | the leaf builds or changes a web UI or mobile screen: layout, components, tokens, states, accessibility. It renders its own result before reporting. A leaf that only changes the logic behind a screen → `task` |
| Writer, mechanical | `sonic` | rename, move, constant or config edit, generated-code refresh: no branching, no design choice, no money, no auth. Any judgement call → `task` |
| Standards reviewer | `reviewer` | default Standards slot |
| Standards reviewer, security surface | `security-reviewer` | the task touches auth, authorization, crypto, secrets, tenant data, payments, or validation of input that crosses a trust boundary: a request, an upload, a webhook, a message from another service. A guard on a value the repo's own code passes is not one. It *replaces* `reviewer` in the slot, never sits beside it |
| Spec reviewer | `reviewer` | always — the review slots are two independent spawns of it, never one spawn asked for both axes |
| Tester | `tester` | the task changes a surface a human operates — web UI, mobile app, TUI, CLI. Drives the running thing, never the diff, and reports observed behaviour with a screenshot or transcript |
| Design reviewer | `uxui-design-review` | the task changes a *visual* surface — web UI or mobile screen. Judges layout, spacing, type, tokens, states, and accessibility against the design source and the repo's existing components. Not dispatched for a TUI or CLI task |
| Context brief | `scout` | `Read first` is missing or stale, or the area is unfamiliar |
| Diagnose | `scout` | third round on one task, DIAGNOSE prompt |
| Mechanical check | `reviewer` | the leaf was written by `sonic`. One spawn replaces the Standards and Spec slots, MECHANICAL CHECK prompt in `references/mechanical-check.md` |
| Notes check | `reviewer` | accepted task received optional polish. One spawn, RE-REVIEW prompt in `references/re-review.md` |
| Ship reviewer | `reviewer` | the phase's last task is committed — one spawn, phase judged whole |

- Every spawn is fresh per task. The one exception is a fix round: message the writer that made the change to resume it, then message each judge of the previous round to re-review it. Same agent type, gone → fresh spawn of that same type
- `scout` and `security-reviewer` are read-only: they diagnose and judge, never fix. Their findings route through `references/drift.md` like any other
- `sonic` is writer-only. Never a reviewer, never the tester or design reviewer, never the scout — a low-reasoning spawn cannot judge a diff or read a screen
- Spawn names are agent definitions, and each one pins its own model and effort. An agent named in a row is missing → `task` runs instead and the setup summary says so
- A subagent inherits the session's MCP connections as proxy tools and cannot load one the project never configured. Setup records the mounted server names and the Tester and Design review prompts carry them, so a slot picks the instrument by capability from its own tool list rather than a server name written down here — this skill never names one, because the list changes per project. Never add, edit, or globally install a server mid-run, and never give these agent files a `tools:` whitelist: a whitelist strips the `mcp__*` proxies the surface slots need

## Durable state

Three stores survive an interruption; the conversation does not.

| Store | Holds | Written |
|---|---|---|
| Plan checkboxes | which tasks are done | close-out step 1 |
| `progress.md` | per-task ledger, findings, rulings | close-out step 2, and whenever a decision is made |
| Git commits | the code, one per task | close-out step 4 |

`progress.md` lives beside the plan, append-only, fixed entry shapes:

```markdown
## 2.3 — done — a1b2c3d
Score: 95/100, PASS. Deductions: Standards S1 minor -3, Design review D1/D2 nit -2. Gates: passed
Deviation: used existing `RetryPolicy` instead of the plan's helper
Accepted as-is: S1/D1/D2, limited impact. Further polish deferred at the acceptance threshold
Unverified: none

## Found — bug — nil deref in export when list empty — `svc/export.go:88` — not fixed, outside task
## Ruling — pagination default 20 — plan silent, repo uses 20 elsewhere — cost if wrong: one-line change
## Next — 2.4
```

The plan gets checkbox flips and structural edits (task split, task added, requirement reconciled). Everything narrative goes to the ledger.

**Resume:** read checkboxes, ledger tail, and git log. Reconcile an unticked committed task only with matching recorded acceptance and passing verification evidence. A commit alone is not completion. Missing evidence → earned reviews through `references/drift.md` before ticking. Previously completed tasks do not need a new score solely because policy changed.

## Setup — once per session

Read `references/setup.md` now. In short: clean tree, plan directory ignored, plan and requirements Goal/Non-goals read, verification commands found in the repo, branch for the phase, summary presented. Every check clean → proceed without waiting. Anything off → stop and ask.

Treat the first task as a probe: after it passes, check whether the plan's files, patterns, and commands held. A plan wrong at task 1 is usually wrong throughout — stop and revise before task 2.

## The cycle

Prompts: `references/subagent-prompts.md` for writers and scouts, `references/review-prompts.md` for judges, `references/re-review.md` for judges after an edit. Routing: `references/drift.md`. Optional edits after acceptance: `references/notes-round.md`.

### 1. DISPATCH writers

Fresh writer spawn per leaf task, agent type from **Role → agent**. Forward the task block, scenarios, must-not-break list, project rules, task-mapped Acceptance criteria, and selected prior feedback verbatim. Include the resolved rubric path. Universal safety and verification gates still apply. The writer runs the repo's tests and reports pass/fail with failing names.

**Batch rule.** One parallel dispatch may spawn up to three leaves as separate writers, and only when both hold:

- every ID in each leaf's `Blocked by` is already `[x]` in the plan
- the leaves' `Files` lists are pairwise disjoint

Overlapping `Files` serialise, always: two writers in one file produce a merge nobody reviewed. Three is the ceiling — a failed batch is unwound by hand, and that cost grows with its size. A plan that "looks parallel" widens nothing.

Then stop and wait for **every** writer in the batch to report. The judging slots for the whole batch then go out together. Findings, close-out, and the commit stay per task, in plan order.

- Plan code is a guideline; the writer reads the real repo and reports deviations
- The writer never commits, never edits the plan, never touches files outside `Files`
- Up to three leaves may share a *single* `sonic` spawn only when mechanical, same file, no branching, no money, no auth
- Two stacks in one plan → one spawn per stack, stack named in every prompt

### 2. DISPATCH the judging slots

First, prove the task's review scope with `git diff --stat -- <Files paths>`. Already implemented work uses the recorded commit diff or named implementation paths through `references/drift.md`. An empty working diff is not acceptance evidence. Bad ref → correct it before dispatch. Every judge receives the same task scope.

Then one parallel dispatch carrying every slot every task in the batch earns, spawns from **Role → agent**. None of them can see the others, so each prompt is self-contained and carries its own criteria verbatim. A leaf written by `sonic` earns one Mechanical check in place of its Standards and Spec slots: `references/mechanical-check.md`.

| Slot | Judges | Dispatched |
|---|---|---|
| **Standards** | Runs required verification first. Failed or unavailable checks → `FAIL`, with cause and coverage recorded. Classifies code-quality findings by impact against the shared rubric | every leaf a `task` writer wrote |
| **Spec** | Does the diff faithfully implement this task's `Done when` and the scenarios it `Serves`? A missing scenario, a silently narrowed scope, and behaviour the task never asked for are its findings | every leaf a `task` writer wrote |
| **Tester** | Runs the app and operates it as a user does, on the best instrument its tool list offers — a mounted MCP tool for the surface, else the browser tool for web, `xcodebuild`/`xcrun simctl` for iOS, the simulator for React Native, launching the binary for TUI and CLI. Reports what it observed per `Done when` line, with a screenshot or a terminal transcript. It reads the diff only to find the route, screen, or command to exercise | web UI, mobile app, TUI, or CLI touched |
| **Design review** | Renders the screen and judges it against the design source named in the task, the repo's existing components and tokens, its states (loading, empty, error, long content), responsive and platform fit, and accessibility. Screenshot per screen or no verdict. No design source → judges against the repo's own patterns and says the source was absent | web UI or mobile screen touched |

Preserve reports verbatim under `## Standards`, `## Spec`, `## Tester`, and `## Design review`. Each axis' PASS confirms its gates and coverage, not task acceptance. Deduplicate root causes for arithmetic only, then calculate one task score using the shared rubric. Never average axis scores. Resolve conflicting levels with the relevant judge. Do not invent a downgrade.

After a batch, the suite covers the whole tree: a failure whose cause lies outside this task's `Files` belongs to the sibling that owns those paths, and is routed there, not to this writer.

Never the writer's session. Never the orchestrator's opinion of the code or the screen in any of the prompts.

### 3. ROUTE findings

Route through `references/drift.md`. BLOCKED → resolve gate failures. FIX → send selected substantive findings to the same writer in one batch, sufficient to reach acceptance. PASS → log remaining findings and close out. No mandatory nit round. A third failed review on one task earns a scout diagnosis before any fourth attempt. Still failing → stop and ask.

**Before a required fix:** stage the task's `Files` as the snapshot in `references/re-review.md`. **After it:** each judge of the previous round re-reviews its prior findings and the edit only, then recalculate acceptance. **After PASS:** no review unless code changes or new gate-failure evidence appears. Optional polish follows `references/notes-round.md`, at most once.

The orchestrator never applies a fix and never reads the diff: `--stat` to prove a ref resolves, never its contents.

### 4. CLOSE OUT — fixed order

Close out only with coordinator PASS on the latest reviewed diff, every axis' gates satisfied, and green required verification. Scores never excuse failed checks or missing observations. Optional edits require verification and a recalculated PASS. Close a batch one task at a time in plan order. A sibling never borrows another task's acceptance.

1. Plan: `- [ ]` → `- [x]` for this task
2. Ledger: append the `## <id> — done` entry (hash added in step 4)
3. Check: `grep` the plan file for `\[x\] <id>:` — exactly one hit. Show the hit; do not assert it
4. Stage explicit touched source files and commit with `[AI] <imperative summary>` (≤50 chars). Never stage the plan. Already committed implementation with no edits → retain its reviewed hash, no empty commit. Append the hash to the ledger
5. Report ≤6 lines: task ID, decision and score, accepted findings, verification, hash, next task

Not a git repo, or the user asked to hold commits → say so; steps 1–3 still happen.

## Verification honesty

- Logic, branching, parsing, money, or auth → a test covers it, and the Standards axis confirms it asserts real values
- A surface a human operates → the Tester spawn drives it and the ledger entry names the evidence. A screenshot or transcript in its report, or it did not happen. The writer never self-certifies a screen it wrote
- A visual surface → the Design review spawn renders it, and a design deviation accepted on purpose is an `Accepted as-is:` line with its reason, never silence
- Cannot verify → `Unverified:` names it in the ledger and the report. Never papered over
- Never make a test pass by deleting it, skipping it, or loosening the assertion

## Scope discipline

- Exactly the current leaf task. Unrelated bug → `## Found` in the ledger, reported, not fixed
- Nearby cleanup is optional and only inside edited code. Record deferred findings. Do not expand work to raise a passing score
- Tempted to narrow, defer, or simplify away specified behaviour to make a task fit → surface it and ask. A task is ticked only when every `Done when` line holds

## Stop conditions

Stop and ask when:

- a task fails review three times (with the scout's diagnosis)
- the plan conflicts with the actual code state, or a requirement turns out wrong
- a decision is needed that the plan and `requirements.md` do not answer
- verification is impossible in this environment
- the action is irreversible: migration, backfill, deletion, deploy, push
- a task keeps growing past one coherent unit

Stopping costs one message. Guessing costs a bad commit and a wrong foundation for every task after it.

## Ship the phase

The last task of a phase is committed → read `references/ship.md`. Dispatch a ship reviewer that runs the full suite, traces every scenario the phase serves to a test or observed behaviour, and drafts the PR description. Present it, list `## Found` items for triage, ask before pushing — push and PR creation always need explicit approval. The next phase branches off `main` after merge; a fresh session is the cheapest place to start it.
