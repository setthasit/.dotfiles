# Design It Twice

Reached from `SKILL.md` when a new module's interface is genuinely open, or when two designs are being argued.

Cost: one framing pass plus three or four subagents. Spend it only on a decision that is expensive to reverse — a published interface, a storage shape, a seam other code will be built on. A CRUD helper does not earn four subagents: design it once and move on.

## 1. Frame the problem space yourself

Framing is not delegable. Subagents start blank, and four blank agents invent four different problems. Write this out and show the user before fanning out:

- The requirement, one or two lines, plus what is explicitly out of scope.
- Constraints every design must satisfy: latency, transactionality, call sites that cannot change, deployment shape.
- The dependency category from `references/deepening.md`.
- The callers that exist today, as `file:symbol`, and what each one needs from the interface.

An illustrative sketch is optional, and it is a sketch, not a proposal. Label it as one. If it reads as a recommendation, every subagent converges on it and you paid for four copies of your own first idea.

## 2. Fan out in ONE batch

One `task` batch, all items concurrent, each with a DIFFERENT named constraint so the outputs cannot converge:

| Item | Named constraint |
|---|---|
| A | Minimise the interface: 1–3 entry points, nothing else exported |
| B | Maximise flexibility for callers that do not exist yet |
| C | Optimise for the single most common caller; everything else may be awkward |
| D | Ports and adapters, with the dependency injected |

Use `scout`: these agents design and report, they do not edit. State in each item that it writes no files and returns text only.

Batch `context` carries the step-1 framing verbatim. Each item's `task` carries its own constraint plus this exact return shape:

```
INTERFACE    the signatures a caller sees, as code
USAGE        one real call, rewritten from an existing caller, as code
HIDES        what a caller no longer has to know
DEPENDENCY   where the seam sits, what is injected, what tests use
TRADE-OFF    what this design is bad at, one line
```

Same shape from every item, or the comparison in step 3 degenerates into reading four essays.

## 3. Compare, then commit

| Axis | Question |
|---|---|
| **Depth** | How much does each interface hide per thing it makes a caller know? |
| **Locality** | Where does the next likely requirement change land: one module, or all of them? |
| **Seam placement** | Is the injected seam a real category 3 or 4 dependency, or a hypothetical one? |

Then give the user ONE opinionated recommendation, or a named hybrid — "B's error model on A's entry points" — with the single sentence that decided it and what it costs. A strong read, not a menu. Handing back four summaries and asking which they prefer returns the decision you were spawned to make.

Two items returning the same interface is not consensus: the framing leaked a preference. Fix step 1 before trusting the agreement.
