---
name: writing-for-agents
description: Use when writing or editing anything an agent reads — a SKILL.md, a `references/` file, AGENTS.md, or any doc reached by a pointer. Covers description-as-context-pointer rules, the disclosure ladder, line and description budgets, the no-op test, and the pre-ship check. Trigger on creating a skill, splitting a long skill, trimming context load, or reviewing agent-facing prose.
---

# Writing For Agents

Every agent-facing document is paid for twice: in tokens, and in attention. Write to cut both without making the document vague.

## The two loads

| Load | Who pays | Consequence |
|---|---|---|
| **Context load** | tokens on the wire | A skill `description` loads in **every** session, fired or not. The body loads on read. A `references/` file loads only when its pointer fires |
| **Cognitive load** | attention across the loaded text | Restated, hedged, and no-op lines dilute the lines that decide behaviour |

Context load is measurable. Cognitive load is why a 400-line skill obeyed at line 12 is ignored at line 380.

## Description = context pointer

One job: fire the skill on the right turn. Not a summary, not a table of contents.

| Rule | Why |
|---|---|
| Front-load the trigger | The first ~10 words do the matching |
| One trigger per branch | Synonyms renaming one branch are one branch written twice — collapse them |
| Cut identity the body carries | "This skill provides…", section lists, philosophy: delete |
| Name the surface | File types, commands, symbols, phrases the user actually types |
| Never negate-only | "Do not use for X" without naming what it *is* for cannot fire |

No auto-fire wanted (an orchestration skill a human starts) → keep triggers narrow and literal, and put the gate in the body's first section. A skill fires off its description; a body gate is what stops it running at the wrong time.

## Budgets

| Unit | Budget | Hard cap |
|---|---|---|
| `description` | 400 chars | 600 |
| `SKILL.md` | 150 lines | 200 |
| One `references/` file | 120 lines | 200 |
| One skill directory | 800 lines total | — |

Caps are ceilings, not targets. Over cap → split by branch or by sequence. Never fix an over-cap document by compressing wording until it stops deciding anything.

## The ladder — where a line goes

1. **In-file step** — every invocation needs it. Stays in `SKILL.md`.
2. **In-file reference** — most invocations consult it: the budget table, the decision table.
3. **Disclosed reference** — `references/<topic>.md`. Only some branches reach it. The pointer names the branch *and* the file.
4. **Script or asset** — deterministic work belongs in `scripts/`, fixtures and templates in `assets/`. Code the agent runs beats prose it must follow.

**Branching test**: inline what every branch needs, disclose what only some branches reach. Branching is the test, not size.

Pointer form:

- Inside a skill: `` `references/<topic>.md` `` — relative path, plus the branch that fires it.
- Across skills: `` skill://<name> `` — never paraphrase another skill's rule.

## The no-op test

Delete any instruction the model already follows by default. It pays context load to say nothing.

| No-op | Fix |
|---|---|
| "be careful", "think step by step", "use best practices" | delete |
| "write clean code" | name the rule, or point at `skill://clean-code` |
| "make sure it works" | the observable check: command + expected output |
| a rule a linter, type checker, or tool contract already enforces | delete; name the tool |

A failing sentence gets deleted whole. Trimming words leaves a shorter no-op.

## Single source of truth

- One rule, one file. A second copy drifts, and the reader cannot tell which won.
- Overlap with another skill → pointer, not paraphrase.
- A rule that only exists to restate the harness's own defaults is duplication of the largest kind.

## Decisive prose

| Instead of | Write |
|---|---|
| "consider using X" | "use X; Y only when Z" |
| "it may be helpful to verify" | "verify" |
| a paragraph of caveats | a table, one row per branch |
| "avoid bad tests" | the observable rule plus one worked bad example |

- Branches as tables or lists. Prose chains hide branches.
- Leading words that compact a pretrained concept — *red*, *tight loop*, *seam*, *guard clause*, *deep module* — beat a definition paragraph. Define once, in one place, then reuse the word.
- Completion criteria are observable: "grep returns nothing", "named test passes", "endpoint returns 400". Never "ensure quality".
- One worked example beats three abstract rules. Two examples of the same shape are one example.

## Anatomy

```
skills/<name>/
  SKILL.md          frontmatter + the steps
  references/       disclosed detail, one topic per file
  scripts/          deterministic work the agent runs
  assets/           templates and fixtures it copies
```

Frontmatter carries `name` and `description` only; `name` matches the directory. Full anatomy, orphan rule, and the split procedure: `references/skill-anatomy.md`.

## Vendored skills are read-only

`.skill-lock.json` lists skills installed from third parties (`caveman`, every `proxyman-*`). An edit there is clobbered on the next update.

Need a change → fork under a new name, or send it upstream. Never edit a locked skill in place.

## Before shipping

- [ ] `description` fires on the real trigger, inside budget, no identity padding
- [ ] Every line survives the no-op test
- [ ] Nothing duplicates another skill; overlaps are pointers
- [ ] Every branch that only some invocations reach sits behind a pointer that names it
- [ ] Every pointer resolves; no orphan file in `references/`
- [ ] Completion criteria are observable
- [ ] `python3 skills/writing-for-agents/scripts/check_skills.py` exits 0
