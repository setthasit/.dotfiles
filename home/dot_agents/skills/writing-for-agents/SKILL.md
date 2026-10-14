---
name: writing-for-agents
description: Use when writing or editing anything an agent reads (a SKILL.md, a `references/` file, AGENTS.md, or any doc reached by a pointer). Covers description-as-context-pointer rules, the disclosure ladder, line and description budgets, the no-op test, and the pre-ship check. Trigger on creating a skill, splitting a long skill, trimming context load, or reviewing agent-facing prose.
---

# Writing For Agents

Every line costs tokens and reader attention. Cut lines that decide nothing.

## The two loads

| Load | Who pays | Consequence |
|---|---|---|
| **Context load** | tokens on the wire | A skill `description` loads in **every** session, fired or not. The body loads on read. A `references/` file loads only when its pointer fires |
| **Cognitive load** | attention across the loaded text | Restated, hedged, and no-op lines dilute the lines that decide behaviour |

## Description = context pointer

One job: fire the skill on the right turn. Not a summary, not a table of contents.

| Rule | Why |
|---|---|
| Front-load the trigger | The first ~10 words do the matching |
| One trigger per branch | Synonyms renaming one branch are one branch written twice. Collapse them |
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
| One skill directory | 800 lines of `*.md` total | none |

Caps are ceilings, not targets. Over cap → split by branch or by sequence. Never fix an over-cap document by compressing wording until it stops deciding anything.

## The ladder: where a line goes

1. **In-file step**: every invocation needs it. Stays in `SKILL.md`.
2. **In-file reference**: most invocations consult it (the budget table, the decision table).
3. **Disclosed reference**: `references/<topic>.md`. Only some branches reach it. The pointer names the branch *and* the file.
4. **Script or asset**: deterministic work belongs in `scripts/`, fixtures and templates in `assets/`. Code the agent runs beats prose it must follow.

**Branching test**: inline what every branch needs, disclose what only some branches reach. Branching is the test, not size.

Pointer form:

- Inside a skill: `` `references/<topic>.md` `` as a relative path, plus the branch that fires it.
- Across skills: ``the `<name>` skill``. Never paraphrase another skill's rule.

## The no-op test

Delete any instruction the model already follows by default. It pays context load to say nothing.

| No-op | Fix |
|---|---|
| "be careful", "think step by step", "use best practices" | delete |
| "write clean code" | name the rule, or point at the `clean-code` skill |
| "make sure it works" | the observable check: command + expected output |
| a rule a linter, type checker, or tool contract already enforces | delete; name the tool |

A failing sentence gets deleted whole. Trimming words leaves a shorter no-op.

## Single source of truth

- One rule, one file. A second copy drifts, and the reader cannot tell which won.
- Overlap with another skill → pointer, not paraphrase.
- Never restate a harness default.

## Decisive prose

| Instead of | Write |
|---|---|
| "consider using X" | "use X; Y only when Z" |
| "it may be helpful to verify" | "verify" |
| a paragraph of caveats | a table, one row per branch |
| "avoid bad tests" | the observable rule plus one worked bad example |

- Branches as tables or lists. Prose chains hide branches.
- Use a known term (*red*, *guard clause*, *idempotent*) instead of defining it. A term the reader cannot know gets defined once, in one place, then reused.
- Completion criteria are observable: "grep returns nothing", "named test passes", "endpoint returns 400". Never "ensure quality".
- One worked example beats three abstract rules. Two examples of the same shape are one example.

## Anatomy

Creating a skill, splitting one, or auditing its directory: `references/skill-anatomy.md` holds the layout, the frontmatter, the orphan rule, and the split procedure.

## Before shipping

- [ ] `description` fires on the real trigger, inside budget, no identity padding
- [ ] Every line survives the no-op test
- [ ] Nothing duplicates another skill; overlaps are pointers
- [ ] Every branch that only some invocations reach sits behind a pointer that names it
- [ ] Every pointer resolves; no orphan file in `references/`
- [ ] Completion criteria are observable
- [ ] `python3 ~/.agents/skills/writing-for-agents/scripts/check_skills.py` exits 0. It audits the rendered home, `~/.agents/skills/`, not a source tree
