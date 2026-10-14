#!/usr/bin/env python3
import fnmatch
from itertools import zip_longest
import json
import re
import sys
from pathlib import Path

import agent_roles
import secret_paths


EXACT_ID_OF_ALIASED_FAMILY = re.compile(r"^claude-(opus|sonnet|haiku)-")
REVIEW_FORBIDDEN_TOOLS = {"Edit", "Write", "NotebookEdit", "Agent"}
MCP_TOOLS = "mcp__*"
SECURITY_SKILL = "application-security"
SECURITY_SKILL_AGENTS = ("task", "task-light", "sonic", "uxui-designer", "reviewer", "ship-reviewer", "security-reviewer")
SUMMARY_ONLY_AGENTS = ("scout", "verifier", "tester", "uxui-design-review")
POLICY_PATH = ".config/ai/AGENTS.md"
POLICY_BYTE_CEILING = 10_500


def tool_names(fields, key):
    return {tool.strip() for tool in fields.get(key, "").split(",") if tool.strip()}


def has_forbidden_review_tool(fields):
    if "tools" in fields:
        allowed = tool_names(fields, "tools")
        return bool(allowed & REVIEW_FORBIDDEN_TOOLS) or any(tool.startswith("mcp__") for tool in allowed)
    return not (REVIEW_FORBIDDEN_TOOLS | {MCP_TOOLS}) <= tool_names(fields, "disallowedTools")


def review_role_failures(home, reviewers):
    agents = home / ".claude/agents"
    failures = []
    for name in reviewers:
        path = agents / f"{name}.md"
        if not path.is_file():
            failures.append(f"Claude Code lacks agent {name}")
            continue
        fields = agent_roles.frontmatter(path)
        if fields.get("name") != name:
            failures.append(f"Claude Code agent file {name}.md names agent {fields.get('name') or 'unset'}")
        if has_forbidden_review_tool(fields):
            failures.append(f"Claude Code review agent {name} can use Edit, Write, NotebookEdit, Agent, or MCP tools")
    return failures


def security_skill_failures(home):
    agents = home / ".claude/agents"
    failures = []
    for name in SECURITY_SKILL_AGENTS + SUMMARY_ONLY_AGENTS:
        path = agents / f"{name}.md"
        if not path.is_file():
            failures.append(f"Claude Code lacks agent {name}")
            continue
        is_preloaded = SECURITY_SKILL in agent_roles.frontmatter_list(path, "skills")
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


def protected_edit_failures(deny):
    protected = secret_paths.load_protected_config()
    expected = [f"Edit(~/{file})" for file in protected["files"]]
    expected += [f"Edit(~/{directory}/**)" for directory in protected["dirs"]]
    return [f"Claude Code lacks edit deny {rule}" for rule in expected if rule not in deny]


def main():
    home = Path(sys.argv[1])
    settings = json.loads((home / ".claude/settings.json").read_text())

    deny = settings["permissions"]["deny"]
    agent_roles.load()
    reviewers = sorted(agent_roles.PINNED_REVIEWERS)
    failures = (exact_id_effort_keys(settings) + secret_read_failures(deny) + protected_edit_failures(deny)
                + review_role_failures(home, reviewers) + security_skill_failures(home)
                + policy_size_failures(home))
    if failures:
        sys.exit("\n".join(f"FAIL: {failure}" for failure in failures))
    print("PASS: Claude Code keys every per-model effort setting by family alias where one exists")
    print("PASS: Claude Code read denies match the shared secret-path list, rule for rule and in order")
    print("PASS: Claude Code denies edits to every path in the shared protected-config list")
    print(f"PASS: Claude Code review agents {', '.join(reviewers)} exist under their own names "
          "and have no Edit, Write, NotebookEdit, Agent, or MCP tool")
    print(f"PASS: Claude Code preloads skill {SECURITY_SKILL} on {', '.join(SECURITY_SKILL_AGENTS)} "
          f"and not on {', '.join(SUMMARY_ONLY_AGENTS)}")
    print(f"PASS: Claude Code policy {POLICY_PATH} is at most {POLICY_BYTE_CEILING} bytes")
    print("NOT VERIFIED: Claude Code read decisions. These checks are structural")


if __name__ == "__main__":
    main()
