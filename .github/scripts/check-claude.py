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
VARIANT_OF = {
    "ship-reviewer": ("reviewer", ("name", "description", "effort", "experimental")),
    "task-light": ("task", ("name", "description", "model")),
}
SECURITY_SKILL = "application-security"
SECURITY_SKILL_AGENTS = ("task", "task-light", "sonic", "uxui-designer", "reviewer", "ship-reviewer", "security-reviewer")
SUMMARY_ONLY_AGENTS = ("scout", "tester", "uxui-design-review")
POLICY_PATH = ".config/ai/AGENTS.md"
POLICY_BYTE_CEILING = 13_121


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


def frontmatter_list(path, key):
    block, _ = split_frontmatter(path)
    items = []
    is_key_list = False
    for line in block.splitlines():
        if not line.startswith((" ", "-")):
            is_key_list = line.partition(":")[0].strip() == key
        elif is_key_list:
            items.append(line.strip().removeprefix("- ").strip())
    return items


def shared_frontmatter_lines(block, own_fields):
    lines = []
    is_own_field = False
    for line in block.splitlines():
        if not line.startswith((" ", "-")):
            is_own_field = line.partition(":")[0].strip() in own_fields
        if not is_own_field:
            lines.append(line)
    return lines


def shown_line(line):
    if line is None:
        return "no line"
    return f'"{line}"'


def first_variant_difference(variant, base, part, lines, base_lines):
    for line, base_line in zip_longest(lines, base_lines):
        if line != base_line:
            return [f"Claude Code agent {variant} has {part} line {shown_line(line)} "
                    f"where {base} has {shown_line(base_line)}"]
    return []


def variant_parity_failures(home):
    agents = home / ".claude/agents"
    failures = []
    for variant, (base, own_fields) in VARIANT_OF.items():
        variant_path = agents / f"{variant}.md"
        base_path = agents / f"{base}.md"
        if not (variant_path.is_file() and base_path.is_file()):
            continue
        block, body = split_frontmatter(variant_path)
        base_block, base_body = split_frontmatter(base_path)
        failures += (first_variant_difference(variant, base, "frontmatter",
                                              shared_frontmatter_lines(block, own_fields),
                                              shared_frontmatter_lines(base_block, own_fields))
                     + first_variant_difference(variant, base, "body", body.splitlines(), base_body.splitlines()))
    return failures


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
    return failures


def security_skill_failures(home):
    agents = home / ".claude/agents"
    failures = []
    for name in SECURITY_SKILL_AGENTS + SUMMARY_ONLY_AGENTS:
        path = agents / f"{name}.md"
        if not path.is_file():
            failures.append(f"Claude Code lacks agent {name}")
            continue
        is_preloaded = SECURITY_SKILL in frontmatter_list(path, "skills")
        if name in SECURITY_SKILL_AGENTS and not is_preloaded:
            failures.append(f"Claude Code agent {name} lacks skill preload {SECURITY_SKILL}")
        if name in SUMMARY_ONLY_AGENTS and is_preloaded:
            failures.append(f"Claude Code agent {name} preloads skill {SECURITY_SKILL}, which belongs only on writers and judges")
    return failures


def policy_size_failures(home):
    size = (home / POLICY_PATH).stat().st_size
    if size > POLICY_BYTE_CEILING:
        return [f"Claude Code policy {POLICY_PATH} is {size} bytes, over the {POLICY_BYTE_CEILING}-byte ceiling"]
    return []


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
                + review_role_failures(home) + variant_parity_failures(home) + security_skill_failures(home)
                + policy_size_failures(home))
    if failures:
        sys.exit("\n".join(f"FAIL: {failure}" for failure in failures))
    print("PASS: Claude Code keys every per-model effort setting by family alias where one exists")
    print("PASS: Claude Code read denies match the shared secret-path list, rule for rule and in order")
    efforts = ", ".join(f"{name} at {effort}" for name, effort in REVIEW_ROLE_EFFORTS.items())
    print(f"PASS: Claude Code names and runs each review agent as expected: {efforts}")
    for variant, (base, own_fields) in VARIANT_OF.items():
        print(f"PASS: Claude Code {variant} matches {base} in body and in frontmatter apart from {', '.join(own_fields)}")
    print(f"PASS: Claude Code preloads skill {SECURITY_SKILL} on {', '.join(SECURITY_SKILL_AGENTS)} "
          f"and not on {', '.join(SUMMARY_ONLY_AGENTS)}")
    print(f"PASS: Claude Code policy {POLICY_PATH} is at most {POLICY_BYTE_CEILING} bytes")
    print("NOT VERIFIED: Claude Code read decisions. These checks are structural because CI has no Claude CLI")


if __name__ == "__main__":
    main()
