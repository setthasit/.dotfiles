#!/usr/bin/env python3
import json
import re
import shlex
import subprocess
import sys
import tomllib
from pathlib import Path

import ci_common  # refuses to run under python3 -O
from command_tiers import CASES

STACK_SPECIFIC = re.compile(
    r"(?<![\w-])(rails|artisan|prisma|drizzle-kit|alembic|goose|next|vercel|wrangler|firebase|supabase|eas)(?![\w-])",
    re.I,
)


def glob_matches(pattern, command):
    regex = ".*".join(re.escape(part) for part in pattern.split("*"))
    return re.fullmatch(regex, command, re.S) is not None


def claude_matches(pattern, command):
    # Claude Code quirk: a trailing " *" that is the rule's only wildcard also matches the bare command.
    is_prefix_rule = pattern.endswith(" *") and pattern.count("*") == 1
    return glob_matches(pattern, command) or (is_prefix_rule and command == pattern[:-2])


def bash_patterns(rules):
    return [rule[len("Bash("):-1] for rule in rules if rule.startswith("Bash(")]


def claude_decision(permissions, command):
    for decision in ("deny", "ask", "allow"):
        if any(claude_matches(pattern, command) for pattern in bash_patterns(permissions.get(decision, []))):
            return decision
    return None


def codex_decision(rules_path, command):
    result = subprocess.run(
        ["codex", "execpolicy", "check", "--rules", str(rules_path), "--", *shlex.split(command)],
        text=True, capture_output=True, timeout=30, check=True,
    )
    return json.loads(result.stdout).get("decision")


def tier_mismatches(claude_permissions, codex_rules_path):
    mismatches = []
    for command, claude_tier, codex_tier, _ in CASES:
        decisions = (
            ("Claude Code", claude_tier, claude_decision(claude_permissions, command)),
            ("Codex", codex_tier, codex_decision(codex_rules_path, command)),
        )
        for host, want, got in decisions:
            if want != got:
                mismatches.append(f"{command!r} on {host}: expected {want}, got {got}")
    return mismatches


# The one allow exception: file-tool reads of the shared skills, so auto mode never asks before a skill reference is read.
SKILL_READ_ALLOWS = {"Read(~/.claude/skills/**)", "Read(~/.agents/skills/**)"}


def baseline_failures(claude, codex_rules):
    permissions = claude["permissions"]
    checks = [
        (permissions["defaultMode"] == "auto", "Claude Code permissions.defaultMode is not auto"),
        (not permissions.get("ask"), "Claude Code has ask rules"),
        (set(permissions.get("allow", [])) <= SKILL_READ_ALLOWS, "Claude Code has allow rules beyond the skill reads"),
        (claude["sandbox"]["enabled"] is False, "Claude Code sandbox is enabled"),
        (claude["autoMode"]["soft_deny"] == ["$defaults"], "Claude Code autoMode.soft_deny is not [\"$defaults\"]"),
        ('decision="prompt"' not in codex_rules, "Codex rules prompt for a command"),
        ('decision="allow"' not in codex_rules, "Codex rules allow a command"),
    ]
    return [message for holds, message in checks if not holds]


def stack_specific_entries(entries_by_host):
    return [
        f"{host} names a framework or platform command: {entry!r}"
        for host, entries in entries_by_host.items()
        for entry in entries
        if STACK_SPECIFIC.search(entry)
    ]


def main():
    home = Path(sys.argv[1])
    claude = json.loads((home / ".claude/settings.json").read_text())
    permissions = claude["permissions"]
    codex_rules_path = home / ".codex/rules/managed.rules"
    codex_rules = codex_rules_path.read_text()
    reviewer_policy = tomllib.loads((home / ".codex/config.toml").read_text())["auto_review"]["extra_policy"]

    failures = baseline_failures(claude, codex_rules) + tier_mismatches(permissions, codex_rules_path)
    failures += stack_specific_entries({
        "Claude Code": [*permissions["deny"], *claude["autoMode"]["soft_deny"]],
        "Codex": [*codex_rules.splitlines(), *reviewer_policy.splitlines()],
    })
    if failures:
        sys.exit("\n".join(f"FAIL: {failure}" for failure in failures))
    print(f"PASS: {len(CASES)} commands land in the expected tier on Claude Code and Codex, "
          "and no rule names a framework or platform")


if __name__ == "__main__":
    main()
