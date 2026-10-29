---
name: implement-plan-execution
description: Use when executing an implementation plan: a `.plans/**/plan.md` or `phase-*.md` file, or any markdown task list with `- [ ]` checkboxes. Trigger on "execute the plan", "implement this plan", "continue the plan", "work through phase 2", or any request to start or resume work from a plan document.
---

# Implementation Plan Execution

Run a checkbox plan in dependency order. Each batch of leaf tasks goes through five steps: dispatch writers, verify the batch, dispatch judges, route findings, close out. VERIFY and the judges go out in one parallel dispatch. Writers and judges for independent leaves run in parallel. Findings, close-out, and commits stay per task, in plan order. One session runs one part. A phase ends as one PR a human can review.

Scoring has two sources. The `clean-code` skill's Review Scoring reference is the rubric: acceptance gates and finding levels. `references/scoring.md` turns the judges' findings into one decision. Load nothing else from `clean-code`: this session writes and reviews no code.

## Role: coordinator

This session is the coordinator. It lives longest in the run, so every token it reads is paid again on every remaining task. It coordinates and never executes.

**Allowed**, and nothing else:

| Action | Scope |
|---|---|
| Read | plan files; `requirements.md` Goal, Non-goals, Quality bar, and Acceptance only; `progress.md` tail; subagent briefs and reports; the two scoring files; package manifests and CI config at setup. Read a skill's reference file with the file-read tool, one file per read, never through a shell command or chained with `cd` or `git` |
| Edit | plan checkboxes and structural plan edits; `progress.md`; the part brief in the plan directory's `briefs/` |
| Run | `python3 ~/.agents/skills/implementation-plan-creator/scripts/plan_check.py` `lint` and `status` on the plan directory |
| Spawn, message | dispatch and message subagents |
| Git | `status`, `log`, `diff --stat`, `checkout -b`, `checkout <phase branch>`, `add <explicit files>`, `commit` |

Everything else is a spawn: reading a source or test file, running a test, lint, build, or the app, diagnosing a failure, reviewing a diff, fixing a finding. Reaching for one of those means a dispatch was skipped.

**After a dispatch, stop.** No reads, no edits, no commands while any spawn is running. Wait for every report in flight.

**Pointers, not payloads.** Forward the plan's `Read first` lines. Missing or stale → a `scout` brief, never a hunt in this session. Read a finished subagent's report. Never re-read the code to reconstruct what it did.

## Role → agent

Every dispatch picks its agent and prompt from this table. Prompts named in capitals live in `references/subagent-prompts.md` unless the row names another file. A fix round's prompts live in `references/fix-round.md`.

| Role | Agent | When | Prompt |
|---|---|---|---|
| Writer | `task` | default for a leaf task | CODE |
| Writer, visual | `uxui-designer` | the leaf builds or changes a web UI or mobile screen. A leaf that only changes the logic behind a screen → `task` | CODE |
| Writer, light | `task-light` | the leaf names its files and approach, needs no design choice, and stays off the security surface. After its second failed review → fresh `task` | CODE |
| Writer, mechanical | `sonic` | rename, move, constant or config edit, generated-code refresh: no branching, no design choice, and off the security surface | CODE |
| Batch verifier | `verifier` | beside the judges of every batch, every fix round, and committed work. It holds the batch's one full-suite run | VERIFY |
| Task review | `reviewer` | every leaf not written by `sonic` and off the security surface. One judge: spec, then standards | TASK REVIEW, `references/task-review.md` |
| Standards | `security-reviewer` | the leaf is on the security surface. With Spec review, it replaces Task review | STANDARDS REVIEW, `references/review-prompts.md` |
| Spec review | `reviewer` | beside Standards, never alone | SPEC REVIEW, `references/review-prompts.md` |
| Mechanical check | `reviewer` | the leaf was written by `sonic`. Replaces the code judges | MECHANICAL CHECK, `references/mechanical-check.md` |
| Tester | `tester` | the task changes a surface a human operates: web UI, mobile app, TUI, CLI | TESTER, `references/surface-prompts.md` |
| Design review | `uxui-design-review` | the task changes a web UI or mobile screen. Never for a TUI or CLI | DESIGN REVIEW, `references/surface-prompts.md` |
| Context brief | `scout` | `Read first` is missing or stale, or the area is unfamiliar | SCOUT |
| Diagnose | `scout` | the third failed review on one task (step 4) | DIAGNOSE, `references/fix-round.md` |
| Ship reviewer | `ship-reviewer` | the last task of the phase's last part is committed | SHIP REVIEW, `references/ship.md` |
| Craft pass | `tester` when the phase touched a surface a human operates, otherwise `ship-reviewer` | once per phase, at ship, beside the ship review | CRAFT, `references/ship.md` |

**Security surface**: auth, authorization, crypto, secrets, tenant data, payments, or validation of input that crosses a trust boundary (a request, an upload, a webhook, a message from another service). A guard on a value the repo's own code passes is not one.

Every spawn is fresh per task. A fix round is the one exception: message the writer that made the change, then each judge of the previous round. One is gone → fresh spawn of the same agent. An agent in a row is missing → `task` runs instead and the setup summary says so.

## Durable state

Three stores survive an interruption: the plan checkboxes, the `progress.md` ledger, and one git commit per task. The conversation does not.

`progress.md` lives beside the plan. It is append-only, with fixed entry shapes. A task ID carries its phase: `2/2.3` is phase 2, task 2.3, and a single-phase `plan.md` is phase 1. Every report goes under its own heading. A writer's entry is the short report it returns, which names its full report file in the plan directory's `reports/`. The ledger never copies that file's contents. A judge's entry keeps only its `VERDICT` line, its `Findings` lines, its `Unverified` or `Could not exercise` line, and a Tester's or Design review's `Evidence` line. Never copy coverage, trace, or per-command lines. A fix round's headings end in `fix round N`. A judge's heading starts with its role from the table above. Each round ends in one `Decision` entry. A batch gets one `Verification` entry whose heading names every task it covers. It holds the VERIFY report's first line, `PASS` or `FAIL` with counts, and its failing-test lines.

```markdown
## Phase started - phase 2 - branch feat/order-export
## 2/2.3 writer report
## Verification - 2/2.3, 2/2.4
PASS. `412 passed, 0 failed`
## Task review - 2/2.3
## Decision - 2/2.3
Score: 94. Decision: FIX. Deductions: Standards S1 minor -3, S2 minor -3
## 2/2.3 writer report fix round 1
## Decision - 2/2.3 fix round 1
Score: 97. Decision: PASS. Deductions: Standards S2 minor -3
## 2/2.3 - done - a1b2c3d
Score: 97/100. Decision: PASS. Deductions: Standards S2 minor -3. Gates: passed
Deviation: used existing `RetryPolicy` instead of the plan's helper
Accepted as-is: S2, minor, limited impact
Unverified: none

## Found - bug - nil deref in export when list empty - `svc/export.go:88` - not fixed, outside task
## Ruling - pagination default 20 - plan silent, repo uses 20 elsewhere - cost if wrong: one-line change
## Next - 2/2.4
## Handoff - part 2.1 done - branch feat/order-export - e4f5a6b - next: part 2.2, task 2/4.1
## Ship started - phase 2
## Shipped - phase 2 - pushed - f7a8b9c
```

The plan gets checkbox flips and structural edits: a task split, a task added, a requirement reconciled. Everything narrative goes to the ledger. Append every entry due in the same message as your next dispatch, message, or command. Never spend a message on a ledger append alone.

**Resume:** read the checkboxes, the ledger tail, and `git log`. Tick an unticked committed task only when the ledger records its acceptance and passing verification. A commit alone is not completion. Missing evidence → judge it through the "already implemented" row in `references/drift.md` before ticking.

## Setup - once per session

Run `references/setup.md` before the first dispatch. `plan_check.py status` is the source of truth for plan state: the current phase, its current part, the branch, the next batch, and a `state:` keyword. This session dispatches only the current part's leaves. A phase file carrying `Status: outline` is never executed. Treat the first task as a probe: after it passes, check whether the plan's files, patterns, and commands held. A plan wrong at task 1 is usually wrong throughout. Stop and revise before task 2.

## The cycle

### 1. DISPATCH writers

One fresh writer per leaf, with the CODE prompt. Point it at its task block in the phase file and its scenarios in `requirements.md` by ID, never a pasted copy. Write out only what no file holds: the must-not-break list, task-mapped Acceptance criteria, and selected prior feedback, verbatim.

**Part brief.** Text every prompt in the part would repeat goes in one file, written once before the part's first dispatch: `<plan dir>/briefs/<phase>.<part>.md`. It holds the Goal, the project rules, the resolved rubric path, the test commands, and the project's run rules. Each prompt names the file and says to read it first, instead of pasting the text. A ruling that changes a rule edits the brief before the next dispatch.

Writers run only the tests related to their change: the task's own test files, plus the tests that load a file the task changed. The project's related-test command, when setup found one, decides the list. The full suite runs at VERIFY.

**Batch rule.** One parallel dispatch spawns the leaves on the `batch:` line of `plan_check.py status`, each as its own writer. The script allows at most three, all in the current part, every `Blocked by` ID already `[x]`, and `Files` pairwise disjoint. Never widen a batch beyond that line.

- Up to three leaves may share a single `sonic` spawn only when mechanical, same file, no branching, and off the security surface
- Two stacks in one plan → one spawn per stack, stack named in every prompt
- Wait for every writer in the batch to report

### 2. VERIFY the batch

One VERIFY spawn runs the test, lint, and build commands once in the worktree. It is the batch's only full-suite run, because writers ran only related tests. It goes out in the judges' parallel dispatch, step 3, and its report comes to you, never to a judge. A failed or unavailable required check attributed to a task blocks that task's decision, whatever its judges said (`references/scoring.md`). A red report is not itself a failed review. Only a FIX or BLOCKED decision counts.

Fit the commands to the change:

| Change | VERIFY runs |
|---|---|
| A writer batch that touches code the suite loads | the full suite, lint, and build |
| Only docs, or only a standalone script and its own tests | the checks for those files: doc checks, that script's tests. Unsure → the full suite |
| A fix round | the related-test commands the writers reported for the files the round touched, plus lint and build |

A part ending in a handoff needs a full-suite VERIFY after its last edit. The last one came before a fix round → one more VERIFY of the full suite before the handoff.

A check the project's rules tie to a machine state the run must not change, such as a user's app running, and that state is wrong now → record `Unverified:` with the reason and go on. Never ask about it, and never stop or start the user's app.

### 3. DISPATCH judges

First check each writer's short report. Every `Done when` line names the command it ran and the output line that proves it. A line with no proof → message the writer for it before any judge starts. This costs minutes. A judge round that fails on missing evidence costs a fix round.

Then prove each task's review scope with `git diff --stat -- <Files paths>`. Already implemented work uses its recorded commit diff or named paths, through `references/drift.md`. An empty working diff is not acceptance evidence. Bad ref → correct it before dispatch. Then one parallel dispatch carries the VERIFY spawn and every judge each task in the batch needs, by the **Role → agent** table. The part brief's run rules say the app needs the machine to itself → the Tester and Design review go out when VERIFY reports instead, and the code judges still go with it. Wait for VERIFY and every judge before scoring. No judge can see another, so each prompt carries its own criteria verbatim. After a batch, the suite covers the whole tree: a failure whose cause lies outside this task's `Files` belongs to the sibling that owns those paths. Never put the writer's session or the coordinator's opinion of the code or the screen in a prompt. The one exception: the Task review and Spec review judges read the `Done when` lines of the writer's report file as claims to check.

### 4. ROUTE findings

Score with `references/scoring.md`. Route by its decision through `references/drift.md`.

A failed review is any round whose decision is FIX or BLOCKED. A judge's own PASS does not make the round a pass. **Third failed review on one task** → the Diagnose scout, then one more fix round with its diagnosis. That round fails too → stop and ask.

Run each fix round by `references/fix-round.md`.

### 5. CLOSE OUT - fixed order

Close out only with a PASS decision on the latest reviewed diff and green required verification. Close a batch one task at a time in plan order. A sibling never borrows another task's acceptance.

1. Plan: `- [ ]` → `- [x]` for this task. Read the line back: it shows `- [x] <id>:`
2. Stage the touched source files by explicit path, never the plan, and commit with `[AI] <imperative summary>` (≤50 chars). Already committed work with no edits keeps its reviewed hash and gets no empty commit
3. Ledger: append the `## <phase>/<id> - done - <hash>` entry. A surface a human operates → it names the Tester's screenshot or transcript, never the writer's word
4. Report ≤6 lines: task ID, decision and score, accepted findings, verification, hash, next task. Re-run `plan_check.py status` for the next batch

Not a git repo, or the user asked to hold commits → say so. Steps 1 and 3 still happen, with `uncommitted` in place of the hash.

## Stop conditions

Stop and ask when:

- the fix round after a diagnosis fails (step 4)
- the plan conflicts with the actual code state, or a requirement turns out wrong
- a decision is needed that the plan and `requirements.md` do not answer
- a required check cannot run in this environment, outside the machine-state rule in step 2
- the action is irreversible: migration, backfill, deletion, deploy, push
- a task keeps growing past one coherent unit, or fits only by narrowing, deferring, or simplifying away specified behaviour

## End of a part

The last task of the current part is committed → run `references/ship.md`. Another part follows → the handoff, and the session ends. The phase's last part → the ship. Push and PR creation always need explicit approval.
