#!/usr/bin/env python3
import json
import re
import shlex
import subprocess
import sys
import tomllib
from pathlib import Path

# (command, Claude Code, Codex, omp). None means no rule decides the command.
CASES = [
    ("git push origin main", "deny", "forbidden", "deny"),
    ("git push origin HEAD:main", "deny", "forbidden", "deny"),
    ("git push origin refs/heads/master", "deny", "forbidden", "deny"),
    ("git commit --no-verify -m example", "deny", "forbidden", "deny"),
    ("rm -rf /", "deny", "forbidden", "deny"),
    ("rm -rf ~", "deny", "forbidden", "deny"),
    ("mkfs.ext4 /dev/disposable", "deny", "forbidden", "deny"),
    ("printenv HOME", "deny", "forbidden", "deny"),

    ("dropdb app_dev", "ask", "prompt", "prompt"),
    ("pg_restore -d app_dev dump.sql", "ask", "prompt", "prompt"),
    ("docker volume rm pgdata", "ask", "prompt", "prompt"),
    ("docker compose down -v", "ask", "prompt", "prompt"),

    ("terraform apply", "ask", "prompt", "prompt"),
    ("terraform -chdir=infra destroy", "ask", None, "prompt"),
    ("terraform state rm aws_instance.web", "ask", "prompt", "prompt"),
    ("kubectl -n prod delete pod web", "ask", None, "prompt"),
    ("kubectl exec -it web -- sh", "ask", "prompt", "prompt"),
    ("helm upgrade web ./chart", "ask", "prompt", "prompt"),

    ("sudo ls", "ask", "prompt", "prompt"),
    ("diskutil eraseDisk APFS Disposable disk9", "ask", "prompt", "prompt"),
    ("launchctl load example.plist", "ask", "prompt", "prompt"),
    ("defaults write com.example key value", "ask", "prompt", "prompt"),
    ("csrutil disable", "ask", "prompt", "prompt"),

    ("brew install jq", "ask", "prompt", "prompt"),
    ("npm install -g typescript", "ask", "prompt", "prompt"),
    ("npm install typescript -g", "ask", None, "prompt"),
    ("mise use -g node@22", "ask", "prompt", "prompt"),

    ("npm publish", "ask", "prompt", "prompt"),
    ("cargo publish", "ask", "prompt", "prompt"),
    ("gh release create v1.0.0", "ask", "prompt", "prompt"),
    ("docker push registry.example.invalid/app:1", "ask", "prompt", "prompt"),
    ("gh pr merge 12", "ask", "prompt", "prompt"),

    ("git push --force origin feature", "ask", "prompt", "prompt"),
    ("git push origin --tags", "ask", "prompt", "prompt"),
    ("git push origin --delete feature", "ask", "prompt", "prompt"),
    ("git push", "ask", "prompt", "prompt"),
    ("git push origin feature", "allow", "prompt", "allow"),
    ("git push -u origin feature", "allow", "prompt", "allow"),

    ("aws sts get-caller-identity", None, None, None),
    ("gcloud config list", None, None, None),
    ("terraform plan", None, None, None),
    ("terraform state list", None, None, None),
    ("gh pr create --fill", None, None, None),
    ("gh workflow run ci.yml", None, None, None),
    ("git remote add upstream https://example.invalid/repo.git", None, None, None),
    ("rsync -n -a source/ target/", None, None, None),
    ("ssh example.invalid uptime", None, None, None),
    ("docker image prune -f", None, None, None),
    ("psql postgres://localhost/app_dev", None, None, None),
    ("npm install", None, None, None),
    ("npm install lodash", None, None, None),
    ("rm tmp/a.png tmp/b.png", None, "prompt", None),
    ("rm -rf node_modules", None, "prompt", None),
    ("git reset --hard HEAD", None, "prompt", None),
    ("git clean -fd", None, "prompt", None),

    ("rails db:drop", None, None, None),
    ("php artisan migrate:fresh", None, None, None),
    ("npx prisma migrate reset", None, None, None),
    ("drizzle-kit push", None, None, None),
    ("alembic downgrade -1", None, None, None),
    ("supabase db reset", None, None, None),
    ("vercel --prod", None, None, None),
    ("wrangler deploy", None, None, None),
    ("firebase deploy", None, None, None),
    ("eas submit", None, None, None),
    ("eas update", None, None, None),
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


def omp_patterns(config_text):
    pairs = re.findall(r"^\s*- match: (.+)\n\s*approval: (\w+)$", config_text, re.M)
    return [(json.loads(match) if match.startswith('"') else match, approval) for match, approval in pairs]


def omp_decision(patterns, command):
    for pattern, approval in patterns:
        if glob_matches(pattern, command):
            return approval
    return None


def codex_decision(rules_path, command):
    result = subprocess.run(
        ["codex", "execpolicy", "check", "--rules", str(rules_path), "--", *shlex.split(command)],
        text=True, capture_output=True, timeout=30, check=True,
    )
    return json.loads(result.stdout).get("decision")


def tier_mismatches(claude_permissions, codex_rules_path, omp):
    mismatches = []
    for command, *expected in CASES:
        actual = (
            claude_decision(claude_permissions, command),
            codex_decision(codex_rules_path, command),
            omp_decision(omp, command),
        )
        for host, want, got in zip(("Claude Code", "Codex", "omp"), expected, actual):
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
    omp = omp_patterns((home / ".omp/agent/config.yml").read_text())
    codex_rules_path = home / ".codex/rules/managed.rules"
    reviewer_policy = tomllib.loads((home / ".codex/config.toml").read_text())["auto_review"]["extra_policy"]

    failures = tier_mismatches(permissions, codex_rules_path, omp) + stack_specific_entries({
        "Claude Code": [*permissions["deny"], *permissions["ask"], *permissions["allow"], *claude["autoMode"]["soft_deny"]],
        "Codex": [*codex_rules_path.read_text().splitlines(), *reviewer_policy.splitlines()],
        "omp": [pattern for pattern, _ in omp],
    })
    if failures:
        sys.exit("\n".join(f"FAIL: {failure}" for failure in failures))
    print(f"PASS: {len(CASES)} commands land in the expected tier on three hosts, and no rule names a framework or platform")


if __name__ == "__main__":
    main()
