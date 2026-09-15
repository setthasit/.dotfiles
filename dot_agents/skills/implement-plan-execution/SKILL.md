---
name: implement-plan-execution
description: Use when executing an implementation plan — a `document/**/plan.md` or `phase-*.md` file, or any markdown task list with `- [ ]` checkboxes. Trigger on "execute the plan", "implement this plan", "continue the plan", "work through phase 2", or any request to start or resume work from a plan document.
---

# Implementation Plan Execution

Execute a checkbox plan in dependency order: **DISPATCH writers → DISPATCH the judging slots → ROUTE findings → CLOSE OUT**. Independent leaves may be written in parallel; judging, findings, close-out, and commits stay per task, in plan order. A phase ends as one PR a human can review.

The loop is the same whatever the stack. Verification commands and conventions come from the repo at setup, never from here.

## Role: coordinator

The orchestrator is the longest-lived session in the run; every token it absorbs is paid on every remaining task. It coordinates, it does not execute.

**Allowed** — nothing else:

| Action | Scope |
|---|---|
| `read` | plan files; `requirements.md` Goal and Non-goals only; `progress.md` tail; `agent://` briefs and reports; package manifests and CI config at setup |
| `edit` | plan checkboxes and structural plan edits; `progress.md` |
| `task`, `hub` | dispatch and message subagents |
| `git` | `status`, `log`, `diff --stat`, `checkout -b`, `add <explicit files>`, `commit` |

Everything else is a spawn: reading a source or test file, running a test, lint, build, or the app, diagnosing a failure, reviewing a diff, fixing a finding. Reaching for one of those is the signal that a dispatch was skipped.

**After a dispatch, stop.** No reads, no edits, no commands while any writer, reviewer, tester, designer, or scout is running. Wait for every report in flight.

**Pointers, not payloads.** The plan's `Read first` lines are the pointers; forward them. Missing or stale → `scout` brief ≤25 lines, never a hunt in this session. Reports are capped: writer ≤20 lines, each reviewer ≤15, tester ≤15, designer ≤15, scout ≤25. Read a finished subagent's report at `agent://<id>`; never re-read the code to reconstruct what it did.

## Role → agent

Every dispatch picks its spawn from this table. It is the only place agent types are chosen; the prompts, setup, and ship references point here.

| Role | Spawn | Chosen when |
|---|---|---|
| Writer | `task` | default for a leaf task — reads the repo, writes code and tests, runs the suite |
| Writer, mechanical | `sonic` | rename, move, constant or config edit, generated-code refresh: no branching, no design choice, no money, no auth. Any judgement call → `task` |
| Standards reviewer | `reviewer` | default Standards slot |
| Standards reviewer, security surface | `security-reviewer` | the task touches auth, authorization, crypto, input validation, secrets, tenant data, or payments. It *replaces* `reviewer` in the slot, never sits beside it |
| Spec reviewer | `reviewer` | always — the review slots are two independent spawns of it, never one spawn asked for both axes |
| Tester | `tester` | the task changes a surface a human operates — web UI, mobile app, TUI, CLI. Drives the running thing, never the diff, and reports observed behaviour with a screenshot or transcript |
| Designer | `designer` | the task changes a *visual* surface — web UI or mobile screen. Judges layout, spacing, type, tokens, states, and accessibility against the design source and the repo's existing components. Not dispatched for a TUI or CLI task |
| Context brief | `scout` | `Read first` is missing or stale, or the area is unfamiliar |
| Diagnose | `scout` | third round on one task, DIAGNOSE prompt |
| Ship reviewer | `reviewer` | the phase's last task is committed — one spawn, phase judged whole |

- Every spawn is fresh per task. The one exception is a fix round: revive the writer that made the change with `hub send`, same agent type, gone → fresh spawn of that same type
- `scout` and `security-reviewer` are read-only: they diagnose and judge, never fix. Their findings route through `references/drift.md` like any other
- `sonic` is writer-only. Never a reviewer, never the tester or designer, never the scout — a low-reasoning spawn cannot judge a diff or read a screen
- Spawn names are agents, not model roles. `TESTER` and `DESIGNER` in `/model`'s Roles view are model mappings; they reach a dispatch only through the agent files that alias them, and the alias is case-sensitive against the key as stored (`model: ["@TESTER", "@default"]`). An agent named in a row is missing → `task` runs instead and the setup summary says so

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
Deviation: used existing `RetryPolicy` instead of the plan's helper
Accepted as-is: reviewer nit on `fetchAll` naming — matches repo convention
Unverified: none

## Found — bug — nil deref in export when list empty — `svc/export.go:88` — not fixed, outside task
## Ruling — pagination default 20 — plan silent, repo uses 20 elsewhere — cost if wrong: one-line change
## Next — 2.4
```

The plan gets checkbox flips and structural edits (task split, task added, requirement reconciled). Everything narrative goes to the ledger.

**Resume:** read plan checkboxes, the `progress.md` tail, and `git log --oneline` since the plan started. Reconcile: a commit whose task is unticked → tick it, append `## <id> — reconciled on resume — <hash>`. Then continue. Never re-read the codebase to "get back up to speed".

## Setup — once per session

Read `references/setup.md` now. In short: clean tree, plan directory ignored, plan and requirements Goal/Non-goals read, verification commands found in the repo, branch for the phase, summary presented, confirmation received.

Treat the first task as a probe: after it passes, check whether the plan's files, patterns, and commands held. A plan wrong at task 1 is usually wrong throughout — stop and revise before task 2.

## The cycle

Prompts: `references/subagent-prompts.md` for writers and scouts, `references/review-prompts.md` for the review and tester slots. Findings and drift: `references/drift.md`.

### 1. DISPATCH writers

Fresh writer spawn per leaf task, agent type from **Role → agent**. The prompt carries the task block verbatim — `Serves`, `Files`, `Blocked by`, `Read first`, `Change`, `Done when` — plus the scenarios it serves, the must-not-break list, project rules, and any prior review feedback. The writer runs the repo's tests itself and reports pass/fail with failing names only.

**Batch rule.** One `task` call may dispatch up to three leaves as separate writers, and only when both hold:

- every ID in each leaf's `Blocked by` is already `[x]` in the plan
- the leaves' `Files` lists are pairwise disjoint

Overlapping `Files` serialise, always: two writers in one file produce a merge nobody reviewed. Three is the ceiling — a failed batch is unwound by hand, and that cost grows with its size. A plan that "looks parallel" widens nothing.

Then stop and wait for **every** writer in the batch to report. After that the cycle is per task, in plan order: review, findings, close-out, one commit each, serialised.

- Plan code is a guideline; the writer reads the real repo and reports deviations
- The writer never commits, never edits the plan, never touches files outside `Files`
- Up to three leaves may share a *single* `sonic` spawn only when mechanical, same file, no branching, no money, no auth
- Two stacks in one plan → one spawn per stack, stack named in every prompt

### 2. DISPATCH the judging slots

First, in the orchestrator: `git diff --stat -- <the task's Files paths>`, the exact ref every judging slot gets. It scopes the review to this task even when a batched sibling's changes sit in the same tree. Ref does not resolve, or the diff is empty → stop and fix it here. A bad ref fails once in this session, never twice inside the subagents.

Then one `task` call carrying every slot this task earns, spawns from **Role → agent**. None of them can see the others, so each prompt is self-contained and carries its own criteria verbatim:

| Slot | Judges | Dispatched |
|---|---|---|
| **Standards** | Runs test, lint, and build **first**: red → `FAIL` with the failing names and nothing else. Green → code quality against the repo's conventions, `skill://clean-code`, and the code-smell baseline stated in the prompt | every task |
| **Spec** | Does the diff faithfully implement this task's `Done when` and the scenarios it `Serves`? A missing scenario, a silently narrowed scope, and behaviour the task never asked for are its findings | every task |
| **Tester** | Runs the app and operates it as a user does — web UI through the `eval` browser API, iOS through `xcodebuild`/`xcrun simctl`, React Native through the Expo MCP tools or the simulator, TUI and CLI by launching the binary. Reports what it observed per `Done when` line, with a screenshot or a terminal transcript. It reads the diff only to find the route, screen, or command to exercise | web UI, mobile app, TUI, or CLI touched |
| **Designer** | Renders the screen and judges it against the design source named in the task, the repo's existing components and tokens, its states (loading, empty, error, long content), responsive and platform fit, and accessibility. Screenshot per screen or no verdict. No design source → judges against the repo's own patterns and says the source was absent | web UI or mobile screen touched |

Aggregate under the literal headings `## Standards`, `## Spec`, `## Tester`, and `## Designer`, verbatim, one summary line per axis, each report ≤15 lines. Never merged, never re-ranked across axes: a green suite does not offset a missing scenario, a faithful diff does not excuse a failing lint, and neither offsets a screen that does not do what the scenario says or that ignores the design it was given. One axis summarised into the other is how the masked finding gets lost.

After a batch, the suite covers the whole tree: a failure whose cause lies outside this task's `Files` belongs to the sibling that owns those paths, and is routed there, not to this writer.

Never the writer's session. Never the orchestrator's opinion of the code or the screen in any of the prompts.

### 3. ROUTE findings

Every finding — Standards, Spec, Tester, Designer — goes through the disposition table in `references/drift.md`. Short form: blocking findings and non-blocking nits go back to the **same writer** via `hub send`, verbatim, in one batch — every axis' findings in that one batch; a signature change or new file becomes a task; a wrong task stops the run and fixes the plan; an accepted finding is logged. A third round on one task → dispatch a `scout` to diagnose the root cause before any fourth attempt; still failing → stop and ask.

The orchestrator never applies a fix and never reads the diff: `--stat` to prove a ref resolves, never its contents.

### 4. CLOSE OUT — fixed order

Only after `PASS` from **every** axis dispatched for this task, on green verification — a Tester `FAIL`, a `Done when` line it could not observe, or a Designer blocking finding stops the commit exactly as a reviewer `FAIL` does. The order is the invariant; a commit that lands before steps 1–3 is a defect. A batch closes out one task at a time, in plan order — a batched sibling still under review never borrows another's `PASS`.

1. Plan: `- [ ]` → `- [x]` for this task
2. Ledger: append the `## <id> — done` entry (hash added in step 4)
3. Check: `grep` the plan file for `\[x\] <id>:` — exactly one hit. Show the hit; do not assert it
4. `git add <source files the writer touched>` — never `-A`, never the plan directory — then `git commit -m "[AI] <imperative summary>"` (≤50 chars, no task or phase numbers, no plan filename). Append the hash to the ledger entry
5. Report ≤6 lines: task ID, verdict, verification, hash, next task

Not a git repo, or the user asked to hold commits → say so; steps 1–3 still happen.

## Verification honesty

- Logic, branching, parsing, money, or auth → a test covers it, and the Standards axis confirms it asserts real values
- A surface a human operates → the Tester spawn drives it and the ledger entry names the evidence. A screenshot or transcript in its report, or it did not happen. The writer never self-certifies a screen it wrote
- A visual surface → the Designer spawn renders it, and a design deviation accepted on purpose is an `Accepted as-is:` line with its reason, never silence
- Cannot verify → `Unverified:` names it in the ledger and the report. Never papered over
- Never make a test pass by deleting it, skipping it, or loosening the assertion

## Scope discipline

- Exactly the current leaf task. Unrelated bug → `## Found` in the ledger, reported, not fixed
- Boy scout rule only inside code already being edited: one duplicate, one name, one dead branch
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
