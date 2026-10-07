#!/usr/bin/env python3
"""Lint a plan directory, or report where its execution stands."""

import argparse
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

PART_LEAF_CAP = 6
PHASE_PART_CAP = 3
BATCH_CAP = 3
DETAIL_KEYS = ("Serves", "Files", "Blocked by", "Read first", "Change", "Done when")

DASH = r"\s+[—–-]\s+"
PHASE_FILE = re.compile(r"^phase-(\d+)(-.*)?\.md$")
PARENT_LINE = re.compile(r"^- \[([ x])\] Task (\d+):")
LEAF_LINE = re.compile(r"^\s+- \[([ x])\] (\d+\.\d+):")
CHECKBOX_LIKE = re.compile(r"^\s*[-*]\s*\[[\sxX]*\](?!\()")
PART_HEADING = re.compile(r"^### Part (\d+\.\d+):")
DETAIL_HEADING = re.compile(r"^#### (\d+\.\d+):")
DETAIL_FIELD = re.compile(r"^(Serves|Files|Blocked by|Read first|Change|Done when):\s*(.*)$")
TASK_ID = re.compile(r"\b\d+\.\d+\b")
BACKTICKED = re.compile(r"`([^`]+)`")
PARENTHETICAL = re.compile(r"\([^)]*\)")
LINE_SUFFIX = re.compile(r":\d+(-\d+)?$")
FENCES = ("```", "~~~")
SCENARIO_ID = re.compile(r"^R\d+\.S\d+$")
REQUIREMENT_HEADING = re.compile(r"^### (R\d+)\b")
SCENARIO_HEADING = re.compile(r"^#### (S\d+)\b")

PHASE_STARTED = re.compile(rf"^## Phase started{DASH}phase (\d+){DASH}branch (\S+)")
HANDOFF = re.compile(rf"^## Handoff{DASH}part (\d+\.\d+) done")
SHIP_STARTED = re.compile(rf"^## Ship started{DASH}phase (\d+)")
SHIPPED = re.compile(rf"^## Shipped{DASH}phase (\d+)")
LEGACY_RULING = re.compile(rf"^## Ruling{DASH}legacy bare IDs")
BARE_DONE = re.compile(rf"^## (\d+\.\d+){DASH}done")


@dataclass
class Leaf:
    id: str
    done: bool
    line: int
    part: Optional[str] = None
    fields: Optional[dict] = None
    detail_line: Optional[int] = None

    def blocked_by_text(self):
        return PARENTHETICAL.sub("", (self.fields or {}).get("Blocked by", "")).strip()

    def blockers(self):
        text = self.blocked_by_text()
        if text.lower() == "none":
            return []
        return TASK_ID.findall(text)

    def raw_paths(self):
        return BACKTICKED.findall((self.fields or {}).get("Files", ""))

    def paths(self):
        return {os.path.normpath(LINE_SUFFIX.sub("", path)) for path in self.raw_paths()}


@dataclass
class Part:
    id: str
    line: int
    ends_with: str = ""


@dataclass
class Phase:
    number: int
    path: Path
    outline: bool = False
    has_serves: bool = False
    leaves: dict = field(default_factory=dict)
    parts: list = field(default_factory=list)
    details: dict = field(default_factory=dict)
    bad_checkboxes: list = field(default_factory=list)
    duplicate_leaves: list = field(default_factory=list)
    empty_parents: list = field(default_factory=list)

    def is_complete(self):
        return bool(self.leaves) and all(leaf.done for leaf in self.leaves.values())

    def part_leaves(self, part_id):
        return [leaf for leaf in self.leaves.values() if leaf.part == part_id]


@dataclass
class Ledger:
    branches: dict = field(default_factory=dict)
    handoffs: set = field(default_factory=set)
    ship_started: set = field(default_factory=set)
    shipped: set = field(default_factory=set)
    bare_done: set = field(default_factory=set)
    legacy_ruled: bool = False


@dataclass
class Finding:
    path: Path
    line: int
    message: str
    is_error: bool = True

    def __str__(self):
        level = "error" if self.is_error else "warn"
        return f"{self.path.name}:{self.line}: {level}: {self.message}"


def parse_phase(path, number):
    phase = Phase(number, path)
    part = None
    detail_id = None
    parent = None
    leaves_per_parent = {}
    in_fence = False
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.lstrip().startswith(FENCES):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if line.startswith("Status: outline"):
            phase.outline = True
        elif line.startswith("**Serves**"):
            phase.has_serves = True
        elif heading := PART_HEADING.match(line):
            part = Part(heading[1], line_no)
            phase.parts.append(part)
        elif part and not part.ends_with and line.startswith("Ends with:"):
            part.ends_with = line.removeprefix("Ends with:").strip()
        elif leaf := LEAF_LINE.match(line):
            if parent:
                leaves_per_parent[parent] += 1
            if leaf[2] in phase.leaves:
                phase.duplicate_leaves.append((leaf[2], line_no))
                continue
            phase.leaves[leaf[2]] = Leaf(leaf[2], leaf[1] == "x", line_no, part.id if part else None)
        elif match := PARENT_LINE.match(line):
            parent = (match[2], line_no)
            leaves_per_parent[parent] = 0
        elif CHECKBOX_LIKE.match(line):
            phase.bad_checkboxes.append(line_no)
        elif heading := DETAIL_HEADING.match(line):
            detail_id = heading[1]
            phase.details[detail_id] = (line_no, {})
        elif line.startswith("#"):
            detail_id = None
        elif detail_id and (detail := DETAIL_FIELD.match(line)):
            phase.details[detail_id][1][detail[1]] = detail[2].strip()
    phase.empty_parents = [parent for parent, count in leaves_per_parent.items() if count == 0]
    for leaf_id, (line_no, fields) in phase.details.items():
        if leaf_id in phase.leaves:
            phase.leaves[leaf_id].fields = fields
            phase.leaves[leaf_id].detail_line = line_no
    return phase


def load_phases(plan_dir):
    plan_file = plan_dir / "plan.md"
    phase_files = {}
    for path in sorted(plan_dir.glob("phase-*.md")):
        match = PHASE_FILE.match(path.name)
        if not match:
            raise ValueError(f"{path.name} is not named phase-<number>.md or phase-<number>-<description>.md")
        phase_files.setdefault(int(match[1]), []).append(path)
    duplicates = [paths for paths in phase_files.values() if len(paths) > 1]
    if duplicates:
        names = ", ".join(path.name for path in duplicates[0])
        raise ValueError(f"two files claim one phase number: {names}")
    if plan_file.exists() and phase_files:
        raise ValueError("plan.md and phase-*.md both exist; a plan is one shape or the other")
    if plan_file.exists():
        return [parse_phase(plan_file, 1)]
    if not phase_files:
        raise ValueError(f"no plan.md or phase-*.md in {plan_dir}")
    return [parse_phase(paths[0], number) for number, paths in sorted(phase_files.items())]


def read_ledger(plan_dir):
    ledger = Ledger()
    path = plan_dir / "progress.md"
    if not path.exists():
        return ledger
    for line in path.read_text(encoding="utf-8").splitlines():
        if match := PHASE_STARTED.match(line):
            ledger.branches[int(match[1])] = match[2]
        elif match := HANDOFF.match(line):
            ledger.handoffs.add(match[1])
        elif match := SHIP_STARTED.match(line):
            ledger.ship_started.add(int(match[1]))
        elif match := SHIPPED.match(line):
            ledger.shipped.add(int(match[1]))
        elif LEGACY_RULING.match(line):
            ledger.legacy_ruled = True
        elif match := BARE_DONE.match(line):
            ledger.bare_done.add(match[1])
    return ledger


def read_scenarios(plan_dir):
    path = plan_dir / "requirements.md"
    if not path.exists():
        return None
    scenarios, requirement = set(), None
    for line in path.read_text(encoding="utf-8").splitlines():
        if match := REQUIREMENT_HEADING.match(line):
            requirement = match[1]
        elif (match := SCENARIO_HEADING.match(line)) and requirement:
            scenarios.add(f"{requirement}.{match[1]}")
        elif line.startswith("## "):
            requirement = None
    return scenarios


def lint_outline(phase, findings):
    if phase.leaves or phase.details:
        findings.append(Finding(phase.path, 1, "outline holds tasks: detail the whole phase or remove them"))
    if not phase.has_serves:
        findings.append(Finding(phase.path, 1, "outline has no **Serves** line"))


def lint_leaf_fields(phase, leaf, scenarios, findings):
    line = leaf.detail_line
    for key in DETAIL_KEYS:
        if not leaf.fields.get(key):
            findings.append(Finding(phase.path, line, f"{leaf.id} has no `{key}:` line"))
    blocked_by = leaf.blocked_by_text()
    if blocked_by and blocked_by.lower() != "none" and not leaf.blockers():
        findings.append(Finding(phase.path, line, f"{leaf.id} `Blocked by:` is neither `none` nor task IDs"))
    for blocker in leaf.blockers():
        if blocker == leaf.id:
            findings.append(Finding(phase.path, line, f"{leaf.id} is blocked by itself"))
        elif blocker not in phase.leaves:
            findings.append(Finding(phase.path, line, f"{leaf.id} is blocked by unknown task {blocker}"))
    if leaf.fields.get("Files") and not leaf.raw_paths():
        findings.append(Finding(phase.path, line, f"{leaf.id} `Files:` names no `backticked` path"))
    for path in leaf.raw_paths():
        if LINE_SUFFIX.search(path):
            findings.append(Finding(phase.path, line, f"{leaf.id} `Files:` path {path} carries a line number: line pointers go in `Read first:`"))
    serves = PARENTHETICAL.sub("", leaf.fields.get("Serves", ""))
    for scenario in (token.strip() for token in serves.split(",")):
        if not scenario or scenario == "infra":
            continue
        if not SCENARIO_ID.match(scenario):
            findings.append(Finding(phase.path, line, f"{leaf.id} serves {scenario!r}, not R<n>.S<n> or infra"))
        elif scenarios is not None and scenario not in scenarios:
            findings.append(Finding(phase.path, line, f"{leaf.id} serves {scenario}, absent from requirements.md"))


def find_cycle(phase):
    visiting, finished = set(), set()

    def visit(leaf_id, trail):
        if leaf_id in finished or leaf_id not in phase.leaves:
            return None
        if leaf_id in visiting:
            return trail[trail.index(leaf_id):] + [leaf_id]
        visiting.add(leaf_id)
        for blocker in phase.leaves[leaf_id].blockers():
            if blocker == leaf_id:
                continue
            cycle = visit(blocker, trail + [leaf_id])
            if cycle:
                return cycle
        visiting.discard(leaf_id)
        finished.add(leaf_id)
        return None

    for leaf_id in phase.leaves:
        cycle = visit(leaf_id, [])
        if cycle:
            return cycle
    return None


def lint_parts(phase, findings):
    if not phase.parts:
        if len(phase.leaves) > PART_LEAF_CAP:
            findings.append(Finding(phase.path, 1, f"{len(phase.leaves)} leaf tasks need `### Part` headings, at most {PART_LEAF_CAP} per part"))
        return
    if len(phase.parts) > PHASE_PART_CAP:
        findings.append(Finding(phase.path, phase.parts[-1].line, f"{len(phase.parts)} parts, cap is {PHASE_PART_CAP}: split the phase into two features"))
    for index, part in enumerate(phase.parts, 1):
        expected = f"{phase.number}.{index}"
        if part.id != expected:
            findings.append(Finding(phase.path, part.line, f"part {part.id} should be numbered {expected}"))
        if not part.ends_with:
            findings.append(Finding(phase.path, part.line, f"part {part.id} has no `Ends with:` line"))
        count = len(phase.part_leaves(part.id))
        if count > PART_LEAF_CAP:
            findings.append(Finding(phase.path, part.line, f"part {part.id} holds {count} leaf tasks, cap is {PART_LEAF_CAP}"))
    order = {part.id: index for index, part in enumerate(phase.parts)}
    for leaf in phase.leaves.values():
        if leaf.part is None:
            findings.append(Finding(phase.path, leaf.line, f"{leaf.id} sits before the first part heading"))
            continue
        for blocker in leaf.blockers():
            later = phase.leaves.get(blocker)
            if later and later.part in order and order[later.part] > order[leaf.part]:
                findings.append(Finding(phase.path, leaf.detail_line or leaf.line, f"{leaf.id} is blocked by {blocker} in a later part"))


def lint_phase(phase, scenarios, findings):
    if phase.outline:
        lint_outline(phase, findings)
        return
    for line in phase.bad_checkboxes:
        findings.append(Finding(phase.path, line, "checkbox the executor cannot parse: use `- [ ]` or `- [x]` and an `N.M:` task ID"))
    for leaf_id, line in phase.duplicate_leaves:
        findings.append(Finding(phase.path, line, f"task ID {leaf_id} appears twice"))
    for task, line in phase.empty_parents:
        findings.append(Finding(phase.path, line, f"Task {task} has no leaf tasks under it"))
    if not phase.leaves:
        findings.append(Finding(phase.path, 1, "no leaf tasks and no `Status: outline` line"))
    for leaf_id, (line, _) in phase.details.items():
        if leaf_id not in phase.leaves:
            findings.append(Finding(phase.path, line, f"details for {leaf_id}, which has no checkbox"))
    for leaf in phase.leaves.values():
        if leaf.fields is None:
            findings.append(Finding(phase.path, leaf.line, f"{leaf.id} has no `#### {leaf.id}:` details block"))
        else:
            lint_leaf_fields(phase, leaf, scenarios, findings)
    cycle = find_cycle(phase)
    if cycle:
        findings.append(Finding(phase.path, 1, f"`Blocked by` cycle: {' -> '.join(cycle)}"))
    lint_parts(phase, findings)


def lint_detailed_too_early(phases, ledger, findings):
    first_open = next((phase for phase in phases if phase.number not in ledger.shipped), None)
    if first_open is None:
        return
    for phase in phases:
        if phase.number > first_open.number and not phase.outline:
            findings.append(Finding(phase.path, 1, f"detailed before phase {first_open.number} shipped: later phases stay outlines", is_error=False))


def lint(plan_dir):
    return lint_phases(plan_dir, load_phases(plan_dir), read_ledger(plan_dir))


def lint_phases(plan_dir, phases, ledger):
    scenarios = read_scenarios(plan_dir)
    findings = []
    if scenarios is None:
        findings.append(Finding(plan_dir / "requirements.md", 0, "missing: `Serves` IDs not checked", is_error=False))
    for phase in phases:
        lint_phase(phase, scenarios, findings)
    lint_detailed_too_early(phases, ledger, findings)
    return findings


def is_current(phase, ledger):
    if phase.outline:
        return True
    if not phase.is_complete():
        return True
    return phase.number not in ledger.shipped


def bare_id_owners_needing_ruling(phases, ledger):
    if not ledger.bare_done or ledger.legacy_ruled:
        return set()
    owners = set()
    for leaf_id in ledger.bare_done:
        owners |= {phase.number for phase in phases if leaf_id in phase.leaves}
    return owners


def pick_batch(phase, part_id):
    leaves = phase.part_leaves(part_id) if part_id else list(phase.leaves.values())
    ready = []
    for leaf in leaves:
        blockers = [phase.leaves.get(blocker) for blocker in leaf.blockers()]
        if not leaf.done and all(blocker and blocker.done for blocker in blockers):
            ready.append(leaf)
    batch, claimed = [], set()
    for leaf in ready:
        paths = leaf.paths()
        overlap_unknown = not paths
        if overlap_unknown:
            if not batch:
                batch.append(leaf)
            break
        if paths & claimed:
            continue
        batch.append(leaf)
        claimed |= paths
        if len(batch) == BATCH_CAP:
            break
    return ready, batch


def current_part(phase):
    for part in phase.parts:
        if any(not leaf.done for leaf in phase.part_leaves(part.id)):
            return part
    return None


def phase_summary(phase, ledger):
    if phase.outline:
        return f"phase {phase.number}  {phase.path.name}  outline"
    done = sum(leaf.done for leaf in phase.leaves.values())
    if phase.number in ledger.shipped:
        label = "shipped"
    elif phase.is_complete():
        label = "ship started" if phase.number in ledger.ship_started else "complete, not shipped"
    else:
        label = "open"
    parts = "  ".join(
        f"part {part.id} {sum(leaf.done for leaf in phase.part_leaves(part.id))}/{len(phase.part_leaves(part.id))}"
        for part in phase.parts
    )
    return f"phase {phase.number}  {phase.path.name}  {label}  {done}/{len(phase.leaves)}  {parts}".rstrip()


def decide_state(phase, ledger, bare_id_owners):
    if len(bare_id_owners) > 1:
        return "ask-legacy-ids"
    if phase.outline:
        return "detail-outline"
    has_done = any(leaf.done for leaf in phase.leaves.values())
    if has_done and phase.number not in ledger.branches:
        return "ask-branch"
    if phase.is_complete():
        return "ship-resume" if phase.number in ledger.ship_started else "ask-shipped"
    return "run-part"


def attention_items(phase, ledger, bare_id_owners, lint_errors):
    items = []
    if len(bare_id_owners) == 1:
        items.append(f"append `## Ruling - legacy bare IDs - phase {next(iter(bare_id_owners))}`")
    for part in phase.parts[:-1]:
        part_leaves = phase.part_leaves(part.id)
        if part_leaves and all(leaf.done for leaf in part_leaves) and part.id not in ledger.handoffs:
            items.append(f"part {part.id} has every task [x] and no `## Handoff`: run its Part review, then write the handoff, before any dispatch")
    if lint_errors:
        items.append(f"lint: {lint_errors} error(s): run `plan_check.py lint` and fix the plan first")
    return items


def run_part_lines(phase, ledger):
    lines = []
    branch = ledger.branches.get(phase.number)
    lines.append(f"branch: {branch}" if branch else "branch: none yet: create it and append `## Phase started`")
    part = current_part(phase)
    part_leaves = phase.part_leaves(part.id) if part else list(phase.leaves.values())
    if part_leaves:
        is_last = part is None or part is phase.parts[-1]
        done = sum(leaf.done for leaf in part_leaves)
        label = part.id if part else "whole phase"
        lines.append(f"part: {label}  {done}/{len(part_leaves)}  ends after {part_leaves[-1].id}, then {'ship' if is_last else 'handoff'}")
    ready, batch = pick_batch(phase, part.id if part else None)
    if not phase.leaves:
        lines.append("ready: none: the phase has no leaf tasks")
    else:
        lines.append("ready: " + (" ".join(leaf.id for leaf in ready) or "none: open tasks wait on blockers that are not done"))
    lines.append("batch: " + (" ".join(leaf.id for leaf in batch) or "none"))
    return lines


def status(plan_dir):
    phases = load_phases(plan_dir)
    ledger = read_ledger(plan_dir)
    lint_errors = sum(finding.is_error for finding in lint_phases(plan_dir, phases, ledger))
    lines = [phase_summary(phase, ledger) for phase in phases]
    phase = next((phase for phase in phases if is_current(phase, ledger)), None)
    if phase is None:
        lines.append("state: done")
        return lines
    bare_id_owners = bare_id_owners_needing_ruling(phases, ledger)
    state = decide_state(phase, ledger, bare_id_owners)
    lines.append(f"current: phase {phase.number}  {phase.path.name}")
    lines.append(f"state: {state}")
    if state == "run-part":
        lines.extend(run_part_lines(phase, ledger))
    elif state == "ship-resume":
        lines.append(f"branch: {ledger.branches.get(phase.number)}")
    items = attention_items(phase, ledger, bare_id_owners, lint_errors)
    if items:
        lines.append("attention:")
        lines.extend(f"  - {item}" for item in items)
    return lines


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("lint", "status"))
    parser.add_argument("plan_dir", type=Path)
    args = parser.parse_args(argv[1:])
    try:
        if args.command == "lint":
            findings = lint(args.plan_dir)
            for finding in findings:
                print(finding)
            errors = sum(finding.is_error for finding in findings)
            print("clean" if not errors else f"{errors} error(s)")
            return 1 if errors else 0
        print("\n".join(status(args.plan_dir)))
        return 0
    except (OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
