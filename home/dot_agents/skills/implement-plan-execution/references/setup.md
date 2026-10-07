# Session Setup

Once per session, before any dispatch. Every item is a read of a planning file, a manifest, or git state, and nothing else.

1. **Working tree**: `git status`. Uncommitted unrelated changes break per-task staging; dirty → stop and ask
2. **Plan directory ignored**: `git check-ignore <plan dir>` must succeed. Not ignored → report and ask how to exclude it (`.gitignore` vs `.git/info/exclude`); never edit `.git/` or git config without approval
3. **Plan**: run `python3 ~/.agents/skills/implementation-plan-creator/scripts/plan_check.py status <plan dir>`. Read the phase file it names as current, and `requirements.md` Goal, Non-goals, and Acceptance. `attention:` reports lint errors → run the same script with `lint`, and fix each error with a structural plan edit: part headings and `Ends with:` lines for an older plan. A fix needing a decision the plan and requirements do not answer → stop and ask. Load the `clean-code` skill's Review Scoring reference and resolve its real path. Forward that path, task-mapped Acceptance criteria, and universal gates to every writer and judge. Missing rubric or unmapped criterion → stop and correct the planning gap
   Legacy documents without Acceptance use their existing task scenarios, `Done when`, and explicit project constraints alongside the rubric's gates. Map any feature-wide criteria to enforcing tasks and phase verification before dispatch. Do not invent requirements or regrade completed tasks solely because the score policy changed
4. **Ledger**: `progress.md` exists → read its tail (last ten entries) and the `## Next` line; run the resume reconciliation from the skill. The script reads the phase-state lines itself. Missing → created at the first close-out
5. **Project rules**: the project's `AGENTS.md` or `CLAUDE.md` is already in context; open `CONTRIBUTING.md` or `docs/` only if the plan points there
6. **Verification commands**: from `Makefile`, `package.json` scripts, `Cargo.toml`, `Package.swift`, CI workflow. Record test, lint, build. Never invent a command the repo does not define; none exists → say so now
7. **Instruments**: the plan touches a surface a human operates → list the MCP servers this project mounts, from its MCP config (`.mcp.json` at the root, or the host's project config), and record the names. A subagent inherits the session's MCP connections as proxy tools and cannot load a server the project never configured, so this list is the pointer the Tester and Design review prompts carry. Nothing mounted → they use the built-in paths, which is not a defect. Never add, edit, or globally install a server to make a slot happier
8. **Agents**: pick each role's spawn from the skill's **Role → agent** table. Note whether this task's security surface replaces its Task review with a `security-reviewer` Standards slot and a Spec slot, whether the plan touches a web, mobile, TUI, or CLI surface, which adds the Tester slot, and whether that surface is visual, which adds the Design review slot and makes `uxui-designer` the writer of its visual leaves. A named agent is missing → the slot falls back to `task`; say so in the summary
9. **Plan state**: act on the `state:` line from step 3 by the Plan states table below. Every `attention:` line is handled before the first dispatch. After any ledger append, re-run `status`
10. **Summary**: present it
11. **Proceed or stop**: every check above clean and the request named this plan → go on without waiting. Stop and ask only when one is off: a dirty tree, a plan directory that is not ignored, a plan state that stops or asks, a lint error that needs a decision, no test command, a resume that does not reconcile, or a request that did not name the plan
12. **Branch**: the `branch:` line names a branch → `git checkout` it. It says `none yet` → `git checkout -b <type>/<phase-topic>` off `main`, or off the earlier phase's branch when the user chose to stack. That branch already exists → `git checkout` it instead. Then append `## Phase started - phase [N] - branch [branch]`. Commits since this phase's last `## Handoff`, or since the base (`main` or the stacked branch) when there is none, go through the resume reconciliation in the skill. Then the first dispatch

### Plan states

| `state:` | Action |
|---|---|
| `run-part` | Proceed. `part:` names the current part, its last task, and whether a handoff or the ship follows it. `batch:` is the first dispatch. Read the current part's `Ends with:` line and the previous part's |
| `ship-resume` | No writer. Continue from the Ship section of `references/ship.md` on the printed branch |
| `ask-shipped` | Ask whether the phase already shipped. Yes → append `## Shipped - phase [N] - recorded by user`. No → ship it |
| `ask-branch` | Older ledger. Ask for the phase's branch, then append `## Phase started - phase [N] - branch [branch]` |
| `ask-legacy-ids` | Older ledger. Ask which phase each run of bare task IDs belongs to, then append `## Ruling - legacy bare IDs - [the answer]` |
| `detail-outline` | Stop. The phase must be detailed with the `implementation-plan-creator` skill first |
| `done` | Every phase shipped. Report it and stop |

```
## Plan: [name]

### Goal
[1–3 sentences in your own words, to prove the plan was read, not skimmed]

### Plan state
[the `plan_check.py status` output, verbatim]

### Branch
`[branch]` - phase [N], part [N.k] of [count]. This session ends after task [last ID of the part] | `[branch]` - phase [N], ship resume

### Verification commands found
test: <cmd>  |  lint: <cmd>  |  build: <cmd>

### Agents
writer: <name>  |  task review: <name>  |  part and ship review: <name>  |  security standards and spec: <names, or "none: no security surface">  |  tester: <name or "none: no operated surface">  |  design review: <name or "none: no visual surface">

### Instruments
mcp: <server names, or "none: built-in browser/simctl paths">

### Next task
[ID] - [description] - Done when: [first line] | ship review of phase [N]

Proceeding. | Stopped: [the check that is off, and the question]
```
