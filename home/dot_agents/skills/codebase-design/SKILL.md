---
name: codebase-design
description: Use when designing a module or interface, deciding where code should live, judging a codebase that has too many thin layers, extracting something for testability, choosing a seam for a dependency, or reviewing architecture. Owns the depth, seam, leverage and locality vocabulary, the deletion test for whether a module should exist, and a parallel design-it-twice procedure.
---

# Codebase Design

## Glossary

Use these terms, not their loose synonyms: component, service, API, wrapper, shim, layer, boundary, hook, cohesion, coupling.

**Module** is a unit of code with a public surface and hidden internals: a function, a file, a package, a class. Size is not part of the definition.

**Interface** is everything a caller must know to use a module: signatures and types, invariants, ordering guarantees, error modes, performance characteristics. Not just the exported symbols.

**Implementation** is everything behind the interface: algorithms, storage, intermediate state, call fan-out. Changeable without touching a caller.

**Adapter** is a module whose only job is translating one interface into another: a vendor SDK, a transport, an in-memory test stand-in.

**Depth** is complexity hidden divided by complexity exposed. Deep: a small interface over substantial implementation. Shallow: an interface nearly as large as what it hides.

**Seam** is a place where behaviour can be substituted without editing the code around it. Has a location and an enabling point (constructor argument, build tag, injected port).

**Leverage** is how much caller code one interface decision deletes. High leverage: one call replaces ten lines at every call site.

**Locality** is how much of a likely change lands in one module. High: a new requirement edits one file. Low: the same requirement edits every module in the chain.

## Principles

**Depth is a property of the interface, not the implementation.** A 600-line file behind three entry points is deep. Five files behind twelve exports are shallow. Count what a caller must know. Lines of implementation are not the measure.

**The deletion test** is the primary test for "should this exist". Imagine the module deleted and every caller inlining its body:

| Result | Verdict |
|---|---|
| Complexity vanishes. Callers get shorter or stay unchanged | Pass-through. Delete it, inline it |
| Complexity reappears in every caller, or callers now need a fact they were spared | It earns its keep |

Run it before writing a new module, and before extracting one out of a working file.

**One adapter means a hypothetical seam. Two means a real one.** The first implementation gets no port, no interface, no injection. The concrete call is the design. A test stand-in counts as a second implementation only for the dependency categories in `references/deepening.md`.

**Depth is not size.** A god module with a small interface still fails Single Responsibility: it has more than one reason to change, so no change is local. Single Responsibility, function-level limits, and test quality live in the `clean-code` skill.

## When to reach for what

| Situation | Go to |
|---|---|
| A module is shallow, or its dependency makes callers hard to test | `references/deepening.md` |
| A new module's interface is genuinely open, or two designs are being argued | `references/design-it-twice.md` |
| Anything else | the glossary and principles above. No procedure needed |
