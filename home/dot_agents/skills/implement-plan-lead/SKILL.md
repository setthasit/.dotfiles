---
name: implement-plan-lead
description: Use when the user asks to run a checkbox plan unattended across several phases, to the end or through a named phase ("run phases 1 to 10", "run the whole plan while I'm away").
---

# Implementation Plan Lead

You are the **lead**. You stand in for the user across a run of phases X to Y, and you are the one agent that holds the whole goal. A `planner` subagent details each outline phase with the `implementation-plan-creator` skill. A `coordinator` subagent runs each part with the `implement-plan-execution` skill. You approve, answer, and ship. The user reads one report at the end.

## Gate

Check all of these before the user leaves. One fails → say which, and stop.

| Check | Holds when |
|---|---|
| Request | The user's own message in this session names the plan and asks for an unattended run, with a last phase or "to the end" |
| Host | A subagent can spawn subagents. Claude Code: yes |
| Requirements | `requirements.md` exists. No plan file yet → the user confirms in this session that it is approved |
| Start phase | `plan_check.py status` prints `current: phase X`, or exits 2 with no plan file yet and X is 1 |
| Tree | `git status --short` prints nothing. `git check-ignore <plan dir>` succeeds |
| Remote | `git remote get-url origin` and `gh auth status` both exit 0 |

Then tell the user, in one message, the plan, the phase range, and what the run decides alone. Do not wait for a reply.

## What the request authorizes

The run request is the user's standing approval for these, and for nothing else:

- Approving each phase plan a planner writes
- Answering every question a planner or coordinator raises
- `git push -u origin <phase branch>`, `gh pr create`, and `gh pr merge` after the checks pass

Never `gh pr merge --admin`, never force push, never push `main`, never delete a remote branch, never file an issue. Every other rule in the user's global instructions still holds.

## Load once

Read in full: `requirements.md`, `plan.md` or every phase file, every `## Ruling` in `progress.md` and its last ten entries, and the design-source pointers in the project's `AGENTS.md` or `CLAUDE.md`. Never read source code: a code question goes to a `scout` spawn, capped at 25 lines.

Append `## Run - phases [X]-[Y] - started` to `progress.md`. After an interruption or a context reset, that entry, `plan_check.py status`, `gh pr list`, and `git log` give back the run's state.

## Loop

A subagent's report in hand → act on it by the **Plan** or **Execute** section first. No report in hand → run `python3 ~/.agents/skills/implementation-plan-creator/scripts/plan_check.py status <plan dir>`. It prints `current: phase N` with N above Y, or `state: done` → **Final report**. Otherwise act on its output:

| Output | Action |
|---|---|
| exit 2, `error: no plan.md or phase-*.md` | **Plan**: the planner runs the creator's full Workflow |
| any other exit 2 | **Stop the run** |
| `state: detail-outline` | **Plan**: the planner runs the creator's "Detail the next phase" |
| `state: run-part` | **Execute** |
| `state: ship-resume` or `ask-shipped` | **PR lookup** |
| `state: ask-branch` or `ask-legacy-ids` | Answer from `progress.md` and `git log`, and append the entry the setup table in `implement-plan-execution` names. Cannot tell → **Stop the run** |

**PR lookup**: the branch is the one this phase's `## Phase started` entry names. `git checkout <branch>`, then `gh pr list --head <branch> --state all --json number,state,headRefOid,mergeCommit`, newest PR first:

| Newest PR | Action |
|---|---|
| `MERGED` | **Ship** step 7 |
| `OPEN`, and `git rev-parse HEAD` equals its `headRefOid` | **Ship** step 5 |
| `OPEN`, and `git merge-base --is-ancestor <headRefOid> HEAD` exits 0 | **Execute** |
| `OPEN`, any other case | **Stop the run** |
| `CLOSED` | **Stop the run** |
| none | **Execute** |

A subagent reports done but `state:` did not move → the report came early. Message that subagent to finish.

**Round cap**: two messages on one gap, one failed check, or one `## Found` item. A third would be needed → **Stop the run**.

### Plan

Spawn `planner` with the PLANNER prompt from `references/prompts.md`. Its questions get **Answer**. Approve the phase only when all hold:

- `plan_check.py lint <plan dir>` prints `clean`
- Every scenario the phase serves has a task in the coverage matrix
- Every task serves the Goal and stays inside the Non-goals
- Every question the outline left open has an answer
- Every `Done when` line is an observation, not an activity

A gap → message the same planner with each gap. Approved → append `## Ruling - phase [N] plan approved - [the deciding reason]`.

### Execute

Spawn `coordinator` with the COORDINATOR prompt from `references/prompts.md`, one fresh spawn per part. Its report starts with one keyword:

| Report | Action |
|---|---|
| `QUESTION` | **Answer**, by message to the same coordinator |
| `HANDOFF` | `git status --short` is clean and `state:` names the next part → fresh coordinator. Otherwise message it what is off |
| `SHIP` | **Ship** |

### Answer

Look in this order: `requirements.md`, the plan and its rulings, the design sources the project's `AGENTS.md` names, a `scout` for code facts, a web search for outside facts. Pick what best serves the Goal. Two options serve it equally → the one cheaper to reverse. Append `## Ruling - [decision] - [evidence] - cost if wrong: [cost]`, then message the same answer, evidence, and cost.

### Ship

1. The report reads `VERDICT: READY`, `Suite: pass`, and `Unserved scenarios: none`. Otherwise message the coordinator to turn each gap into a task. It cannot → **Stop the run**
2. Each `## Found` item that blocks the Goal or a scenario this phase serves → message the coordinator to add it as a task. The phase ships again after it. Every other item → the final report
3. An `Unverified:` line on a scenario this phase serves → message the coordinator to cover it. It cannot → **Stop the run**
4. A PR is already open for the branch → `git push`, then step 5. Otherwise write the PR description to the scratch directory. `git push -u origin <branch>`, then `gh pr create --base main --head <branch> --body-file <file>`, titled in the repo's commit format. Delete the file
5. Watch `gh pr checks <number> --watch` as a background process. A failed check → message the coordinator its name and log excerpt. It fixes through a new task, then push again. No checks configured → step 1's suite is the evidence
6. Merge with the first method `gh repo view --json mergeCommitAllowed,rebaseMergeAllowed,squashMergeAllowed` allows, in that order: `--merge`, `--rebase`, `--squash`. Merge blocked → **Stop the run**
7. `git checkout main`, `git pull --ff-only`. Append `## Shipped - phase [N] - merged - [merge commit]`

## Stop the run

Stop, leave the tree clean or a `[AI] wip checkpoint` commit, and send the **Final report** with the reason first, when:

- an answer needs any edit to `requirements.md`
- an action is destructive or irreversible beyond the push, PR, and merge above: a migration on shared data, deleting user work, a deploy, a release
- a secret appears in output, or a permission prompt is denied
- branch protection or a required review blocks the merge
- a coordinator stops on a task again after your ruling on that task
- the round cap is reached
- a subagent needs anything the user's global instructions reserve to the user

## Final report

At most 25 lines, and a push notification when the host offers one:

- Each phase: PR URL, merge commit, tasks closed
- Each ruling that changed scope or chose between real options, one line each
- `## Found` items left open, and every `Unverified:` line
- Anything left in a non-default state: a branch not merged, a checkpoint commit, a running process
