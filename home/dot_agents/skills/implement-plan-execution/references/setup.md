# Session Setup

Once per session, before any dispatch. Every item is a read of a planning file, a manifest, or git state — nothing else.

1. **Working tree** — `git status`. Uncommitted unrelated changes break per-task staging; dirty → stop and ask
2. **Plan directory ignored** — `git check-ignore <plan dir>` must succeed. Not ignored → report and ask how to exclude it (`.gitignore` vs `.git/info/exclude`); never edit `.git/` or git config without approval
3. **Plan** — read the phase file and `requirements.md` Goal, Non-goals, and Acceptance. The phase file carries `Status: outline` → stop: it must be detailed with the `implementation-plan-creator` skill before any dispatch. Load the `clean-code` skill's Review Scoring reference and resolve its real path. Forward that path, task-mapped Acceptance criteria, and universal gates to every writer and judge. Missing rubric or unmapped criterion → stop and correct the planning gap
   Legacy documents without Acceptance use their existing task scenarios, `Done when`, and explicit project constraints alongside the rubric's gates. Map any feature-wide criteria to enforcing tasks and phase verification before dispatch. Do not invent requirements or regrade completed tasks solely because the score policy changed
4. **Ledger** — `progress.md` exists → read its tail (last ten entries), the `## Next` line, and the last `## Handoff`; run the resume reconciliation from the skill. Missing → created at the first close-out
5. **Project rules** — the project's `AGENTS.md` or `CLAUDE.md` is already in context; open `CONTRIBUTING.md` or `docs/` only if the plan points there
6. **Verification commands** — from `Makefile`, `package.json` scripts, `Cargo.toml`, `Package.swift`, CI workflow. Record test, lint, build. Never invent a command the repo does not define; none exists → say so now
7. **Instruments** — the plan touches a surface a human operates → list the MCP servers this project mounts, from its MCP config (`.mcp.json` at the root, or the host's project config), and record the names. A subagent inherits the session's MCP connections as proxy tools and cannot load a server the project never configured, so this list is the pointer the Tester and Design review prompts carry. Nothing mounted → they use the built-in paths, which is not a defect. Never add, edit, or globally install a server to make a slot happier
8. **Agents** — pick each role's spawn from the skill's **Role → agent** table. Note whether this task's security surface puts `security-reviewer` in the Standards slot, whether the plan touches a web, mobile, TUI, or CLI surface, which adds the Tester slot, and whether that surface is visual, which adds the Design review slot and makes `uxui-designer` the writer of its visual leaves. A named agent is missing → the slot falls back to `task`; say so in the summary
9. **Progress** — count `[x]` vs `[ ]` per phase and per part. The first phase file that is an outline or has open tasks is the current phase. An outline → stop, as in step 3. Its first part with open tasks is the current part. An earlier part of the current phase with every leaf `[x]` and no `## Handoff` → write the handoff from the ledger before any dispatch. Read the current part's `Ends with:` line and the previous part's
10. **Summary** — present it
11. **Proceed or stop** — every check above clean and the request named this plan → go on without waiting. Stop and ask only when one is off: a dirty tree, a plan directory that is not ignored, an outline phase, no test command, a resume that does not reconcile, or a request that did not name the plan
12. **Branch** — no branch for this phase yet: `git checkout -b <type>/<phase-topic>` off `main`, or off the earlier phase's branch when the user chose to stack. The branch exists (a later part, or a resume): check it out, named in this phase's last `## Handoff`, else the current branch. Commits since that handoff, or since the base (`main` or the stacked branch) when this phase has none, go through the resume reconciliation in the skill. Then the first dispatch

```
## Plan: [name]

### Goal
[1–3 sentences in your own words — proves the plan was read, not skimmed]

| Phase | Status | Progress |
|-------|--------|----------|
| 1     | COMPLETE | 5/5 |
| 2     | IN PROGRESS | 3/8 |
| 3     | OUTLINE | — |

### Branch
`[branch]` — phase [N], part [N.k] of [count]. This session ends after task [last ID of the part]

### Verification commands found
test: <cmd>  |  lint: <cmd>  |  build: <cmd>

### Agents
writer: <name>  |  standards: <name>  |  spec: <name>  |  tester: <name or "none — no operated surface">  |  design review: <name or "none — no visual surface">

### Instruments
mcp: <server names, or "none — built-in browser/simctl paths">

### Next task
[ID] — [description] — Done when: [first line]

Proceeding. | Stopped: [the check that is off, and the question]
```
