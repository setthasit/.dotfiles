---
name: codebase-design
description: Use when designing a module or interface, deciding where code should live, judging a codebase that has too many thin layers, extracting something for testability, choosing a seam for a dependency, or reviewing architecture. Owns the depth, seam, leverage and locality vocabulary, the deletion test for whether a module should exist, and a parallel design-it-twice procedure.
---

# Codebase Design

A reference to consult while a design decision is live, not a workflow to run. Read the glossary and principles, decide, move on. The one procedure here is the parallel exploration in `references/design-it-twice.md`.

Other skills point at this file for the vocabulary rather than redefining it. Deep modules and design-it-twice come from Ousterhout, *A Philosophy of Software Design*; seams from Feathers, *Working Effectively with Legacy Code*.

## Glossary

Each `_Avoid_` word already means three things in a codebase. Use the term defined here instead.

**Module** — a unit of code with a public surface and hidden internals: a function, a file, a package, a class. Size is not part of the definition.
_Avoid_: component, service, unit.

**Interface** — everything a caller must know to use a module: signatures and types, invariants, ordering guarantees, error modes, performance characteristics. Not just the exported symbols.
_Avoid_: API, public API, surface area.

**Implementation** — everything behind the interface: algorithms, storage, intermediate state, call fan-out. Changeable without touching a caller.
_Avoid_: the logic, the internals, business layer.

**Adapter** — a module whose only job is translating one interface into another: a vendor SDK, a transport, an in-memory test stand-in.
_Avoid_: wrapper, shim, client.

**Depth** — complexity hidden divided by complexity exposed. Deep: a small interface over substantial implementation. Shallow: an interface nearly as large as what it hides.
_Avoid_: layer, abstraction level, granularity.

**Seam** — a place where behaviour can be substituted without editing the code around it. Has a location and an enabling point (constructor argument, build tag, injected port).
_Avoid_: boundary, hook, extension point.

**Leverage** — how much caller code one interface decision deletes. High leverage: one call replaces ten lines at every call site.
_Avoid_: reusability, value-add.

**Locality** — how much of a likely change lands in one module. High: a new requirement edits one file. Low: the same requirement edits every module in the chain.
_Avoid_: cohesion, coupling — those name relations between modules, not the cost of a change.

## Principles

Each one has a check you can run, not a slogan to agree with.

**Depth is a property of the interface, not the implementation.** A 600-line file behind three entry points is deep. Five files behind twelve exports are shallow. Count what a caller must know; lines of implementation are not the measure.

**The deletion test** — the primary test for "should this exist". Imagine the module deleted and every caller inlining its body:

| Result | Verdict |
|---|---|
| Complexity vanishes; callers get shorter or unchanged | Pass-through. Delete it, inline it |
| Complexity reappears in every caller, or callers now need a fact they were spared | It earns its keep |

Ten seconds, mentally, twice: before writing a new module, and before extracting one out of a working file.

**The interface is the test surface.** A test that reaches past the interface pins the implementation and blocks every later change to it. Test-quality rules live in `skill://clean-code`.

**One adapter means a hypothetical seam. Two means a real one.** The first implementation gets no port, no interface, no injection — the concrete call is the design. A test stand-in counts as a second implementation only for the dependency categories in `references/deepening.md`.

**Depth is not size.** A god module with a small interface still fails Single Responsibility: it has more than one reason to change, so no change is local. SOLID and function-level limits are `skill://clean-code`; they are not restated here.

## When to reach for what

| Situation | Go to |
|---|---|
| A module is shallow, or its dependency makes callers hard to test | `references/deepening.md` |
| A new module's interface is genuinely open, or two designs are being argued | `references/design-it-twice.md` |
| Anything else | the glossary and principles above; no procedure needed |

## Cross-skill boundaries

- Line-level quality, naming, comments, DRY, SOLID, test quality: `skill://clean-code`.
- The project's terminology for the domain a module serves, and the record of a decision once made: `skill://domain-modeling`.
