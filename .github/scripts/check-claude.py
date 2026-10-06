#!/usr/bin/env python3
import fnmatch
from itertools import zip_longest
import json
import re
import sys
from pathlib import Path

import secret_paths


EXACT_ID_OF_ALIASED_FAMILY = re.compile(r"^claude-(opus|sonnet|haiku)-")
REVIEW_ROLE_EFFORTS = {"reviewer": "high", "ship-reviewer": "xhigh", "security-reviewer": "xhigh"}
SHIP_REVIEWER_OWN_FIELDS = ("name", "description", "effort")


def split_frontmatter(path):
    text = path.read_text()
    if not text.startswith("---\n"):
        return "", text
    block, closing, body = text[len("---\n"):].partition("\n---\n")
    if not closing:
        return "", text
    return block, body


def frontmatter(path):
    block, _ = split_frontmatter(path)
    fields = {}
    for line in block.splitlines():
        if line.startswith((" ", "-")):
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip().strip("\"'")
    return fields


def shared_frontmatter_lines(block):
    lines = []
    is_own_field = False
    for line in block.splitlines():
        if not line.startswith((" ", "-")):
            is_own_field = line.partition(":")[0].strip() in SHIP_REVIEWER_OWN_FIELDS
        if not is_own_field:
            lines.append(line)
    return lines


def shown_line(line):
    if line is None:
        return "no line"
    return f'"{line}"'


def first_ship_reviewer_difference(part, lines, reviewer_lines):
    for line, reviewer_line in zip_longest(lines, reviewer_lines):
        if line != reviewer_line:
            return [f"Claude Code agent ship-reviewer has {part} line {shown_line(line)} "
                    f"where reviewer has {shown_line(reviewer_line)}"]
    return []


def ship_reviewer_parity_failures(agents):
    reviewer = agents / "reviewer.md"
    ship_reviewer = agents / "ship-reviewer.md"
    if not (reviewer.is_file() and ship_reviewer.is_file()):
        return []
    block, body = split_frontmatter(ship_reviewer)
    reviewer_block, reviewer_body = split_frontmatter(reviewer)
    return (first_ship_reviewer_difference("frontmatter", shared_frontmatter_lines(block),
                                           shared_frontmatter_lines(reviewer_block))
            + first_ship_reviewer_difference("body", body.splitlines(), reviewer_body.splitlines()))


def review_role_failures(home):
    agents = home / ".claude/agents"
    failures = []
    for name, wanted in REVIEW_ROLE_EFFORTS.items():
        path = agents / f"{name}.md"
        if not path.is_file():
            failures.append(f"Claude Code lacks agent {name}")
            continue
        fields = frontmatter(path)
        if fields.get("name") != name:
            failures.append(f"Claude Code agent file {name}.md names agent {fields.get('name') or 'unset'}")
        effort = fields.get("effort")
        if effort != wanted:
            failures.append(f"Claude Code agent {name} has effort {effort or 'unset'} where {wanted} belongs")
    return failures + ship_reviewer_parity_failures(agents)


def exact_id_effort_keys(settings):
    return [
        f"modelSettings key {key!r} is an exact model ID. Key it by the family alias instead"
        for key in settings.get("modelSettings", {})
        if EXACT_ID_OF_ALIASED_FAMILY.match(key)
    ]


def shadows_readable(glob, readable):
    return any(fnmatch.fnmatchcase(name, glob) for name in readable)


def expected_secret_reads(secrets):
    rules = []
    for glob in secrets["fileGlobs"]:
        rules.append(f"Read({glob})")
        if not shadows_readable(glob, secrets["readable"]):
            rules.append(f"Read(//**/{glob})")
    rules += [f"Read(!{name})" for name in secrets["readable"]]
    rules += [f"Read(~/{directory}/**)" for directory in secrets["homeDirs"]]
    rules += [f"Read(~/{file})" for file in secrets["homeFiles"]]
    return rules


def secret_read_failures(deny):
    expected = expected_secret_reads(secret_paths.load())
    reads = [rule for rule in deny if rule.startswith("Read(")]
    failures = [f"Claude Code lacks read deny {rule}" for rule in expected if rule not in reads]
    failures += [f"Claude Code has unexpected read deny {rule}" for rule in reads if rule not in expected]
    if failures:
        return failures
    for actual, wanted in zip_longest(reads, expected, fillvalue="no rule"):
        if actual != wanted:
            return [f"Claude Code has read deny {actual} where {wanted} belongs"]
    return []


def main():
    home = Path(sys.argv[1])
    settings = json.loads((home / ".claude/settings.json").read_text())

    failures = (exact_id_effort_keys(settings) + secret_read_failures(settings["permissions"]["deny"])
                + review_role_failures(home))
    if failures:
        sys.exit("\n".join(f"FAIL: {failure}" for failure in failures))
    print("PASS: Claude Code keys every per-model effort setting by family alias where one exists")
    print("PASS: Claude Code read denies match the shared secret-path list, rule for rule and in order")
    efforts = ", ".join(f"{name} at {effort}" for name, effort in REVIEW_ROLE_EFFORTS.items())
    print(f"PASS: Claude Code names and runs each review agent as expected: {efforts}")
    print("PASS: Claude Code ship-reviewer matches reviewer in body and in frontmatter apart from name, description, and effort")
    print("NOT VERIFIED: Claude Code read decisions. These checks are structural because CI has no Claude CLI")


if __name__ == "__main__":
    main()
