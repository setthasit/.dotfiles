#!/usr/bin/env python3
import json
import re
import shlex
import subprocess
import sys
import tomllib
from pathlib import Path

# (command, Claude Code, Codex). None means no rule decides the command.
CASES = [
    ("git push origin main", "deny", "forbidden"),
    ("git push origin HEAD:main", "deny", "forbidden"),
    ("git push origin refs/heads/master", "deny", "forbidden"),
    ("git commit --no-verify -m example", "deny", "forbidden"),
    ("rm -rf /", "deny", "forbidden"),
    ("rm -rf ~", "deny", "forbidden"),
    ("mkfs.ext4 /dev/disposable", "deny", "forbidden"),
    ("printenv HOME", "deny", "forbidden"),

    ("dropdb app_dev", "ask", "prompt"),
    ("pg_restore -d app_dev dump.sql", "ask", "prompt"),
    ("docker volume rm pgdata", "ask", "prompt"),
    ("docker compose down -v", "ask", "prompt"),

    ("terraform apply", "ask", "prompt"),
    ("terraform -chdir=infra destroy", "ask", None),
    ("terraform state rm aws_instance.web", "ask", "prompt"),
    ("kubectl -n prod delete pod web", "ask", None),
    ("kubectl exec -it web -- sh", "ask", "prompt"),
    ("helm upgrade web ./chart", "ask", "prompt"),

    ("sudo ls", "ask", "prompt"),
    ("diskutil eraseDisk APFS Disposable disk9", "ask", "prompt"),
    ("launchctl load example.plist", "ask", "prompt"),
    ("defaults write com.example key value", "ask", "prompt"),
    ("csrutil disable", "ask", "prompt"),

    ("brew install jq", "ask", "prompt"),
    ("npm install -g typescript", "ask", "prompt"),
    ("npm install typescript -g", "ask", None),
    ("mise use -g node@22", "ask", "prompt"),

    ("npm publish", "ask", "prompt"),
    ("cargo publish", "ask", "prompt"),
    ("gh release create v1.0.0", "ask", "prompt"),
    ("docker push registry.example.invalid/app:1", "ask", "prompt"),
    ("gh pr merge 12", "ask", "prompt"),

    ("git push --force origin feature", "ask", "prompt"),
    ("git push origin --tags", "ask", "prompt"),
    ("git push origin --delete feature", "ask", "prompt"),
    ("git push", "ask", "prompt"),
    ("git push origin feature", "allow", "prompt"),
    ("git push -u origin feature", "allow", "prompt"),

    ("aws sts get-caller-identity", None, None),
    ("gcloud config list", None, None),
    ("terraform plan", None, None),
    ("terraform state list", None, None),
    ("gh pr create --fill", None, None),
    ("gh workflow run ci.yml", None, None),
    ("git remote add upstream https://example.invalid/repo.git", None, None),
    ("rsync -n -a source/ target/", None, None),
    ("ssh example.invalid uptime", None, None),
    ("docker image prune -f", None, None),
    ("psql postgres://localhost/app_dev", None, None),
    ("npm install", None, None),
    ("npm install lodash", None, None),
    ("rm tmp/a.png tmp/b.png", None, "prompt"),
    ("rm -rf node_modules", None, "prompt"),
    ("git reset --hard HEAD", None, "prompt"),
    ("git clean -fd", None, "prompt"),

    ("rails db:drop", None, None),
    ("php artisan migrate:fresh", None, None),
    ("npx prisma migrate reset", None, None),
    ("drizzle-kit push", None, None),
    ("alembic downgrade -1", None, None),
    ("supabase db reset", None, None),
    ("vercel --prod", None, None),
    ("wrangler deploy", None, None),
    ("firebase deploy", None, None),
    ("eas submit", None, None),
    ("eas update", None, None),
]
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
        if any(claude_matches(pattern, command) for pattern in bash_patterns(permissions[decision])):
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
    for command, *expected in CASES:
        actual = (
            claude_decision(claude_permissions, command),
            codex_decision(codex_rules_path, command),
        )
        for host, want, got in zip(("Claude Code", "Codex"), expected, actual):
            if want != got:
                mismatches.append(f"{command!r} on {host}: expected {want}, got {got}")
    return mismatches


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
    reviewer_policy = tomllib.loads((home / ".codex/config.toml").read_text())["auto_review"]["extra_policy"]

    failures = tier_mismatches(permissions, codex_rules_path) + stack_specific_entries({
        "Claude Code": [*permissions["deny"], *permissions["ask"], *permissions["allow"], *claude["autoMode"]["soft_deny"]],
        "Codex": [*codex_rules_path.read_text().splitlines(), *reviewer_policy.splitlines()],
    })
    if failures:
        sys.exit("\n".join(f"FAIL: {failure}" for failure in failures))
    print(f"PASS: {len(CASES)} commands land in the expected tier on both hosts, and no rule names a framework or platform")


if __name__ == "__main__":
    main()
