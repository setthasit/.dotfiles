#!/usr/bin/env python3
"""Audit skill directories against the budgets and pointer rules in SKILL.md."""

import re
import sys
from pathlib import Path

DESCRIPTION_BUDGET = 400
DESCRIPTION_CAP = 600
SKILL_LINE_BUDGET = 150
SKILL_LINE_CAP = 200
REFERENCE_LINE_BUDGET = 120
REFERENCE_LINE_CAP = 200
DIRECTORY_LINE_BUDGET = 800
FRONTMATTER_KEYS = {"name", "description"}
BLOCK_SCALAR_INDICATORS = (">", "|")
QUOTES = "\"'"

LOCAL_POINTER = re.compile(r"(?<![\w/])(?:references|scripts|assets)/[A-Za-z0-9_.\-/]+")
SKILL_POINTER = re.compile(r"`([a-z0-9][a-z0-9-]*)` skill\b")

skills_dir = Path(__file__).resolve().parents[2]


def unquote(text):
    return text.strip().strip(QUOTES)


def parse_frontmatter(text):
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---", 4)
    if end == -1:
        return None
    fields, key = {}, None
    for line in text[4:end].split("\n"):
        match = re.match(r"([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$", line)
        if match and not line.startswith((" ", "\t")):
            key = match.group(1)
            value = match.group(2).strip()
            fields[key] = "" if value.startswith(BLOCK_SCALAR_INDICATORS) else unquote(value)
        elif key and line.strip():
            fields[key] = unquote(f"{fields[key]} {line.strip()}")
    return fields


def line_count(path):
    return len(path.read_text(encoding="utf-8").splitlines())


def check_size(label, size, budget, cap, errors, warnings):
    if size > cap:
        errors.append(f"{label} {size} > cap {cap}")
    elif size > budget:
        warnings.append(f"{label} {size} > budget {budget}")


def check_pointers(skill, errors):
    pointed_at = set()
    for doc in sorted(skill.rglob("*.md")):
        body = doc.read_text(encoding="utf-8")
        for target in LOCAL_POINTER.findall(body):
            resolved = skill / target.rstrip(".,);:`")
            pointed_at.add(resolved)
            if not resolved.exists():
                errors.append(f"{doc.name} points at missing {target}")
        for name in SKILL_POINTER.findall(body):
            if not (skills_dir / name).is_dir():
                errors.append(f"{doc.name} points at unknown skill {name}")
    return pointed_at


def check(skill):
    errors, warnings = [], []
    fields = parse_frontmatter((skill / "SKILL.md").read_text(encoding="utf-8"))
    description = ""

    if fields is None:
        errors.append("frontmatter missing or unterminated")
        fields = {}
    else:
        description = fields.get("description", "")
        if fields.get("name") != skill.name:
            errors.append(f"name {fields.get('name')!r} != directory {skill.name!r}")
        if not description:
            errors.append("description missing")

    for key in sorted(set(fields) - FRONTMATTER_KEYS):
        warnings.append(f"unknown frontmatter key {key!r}")

    check_size("description chars", len(description), DESCRIPTION_BUDGET, DESCRIPTION_CAP, errors, warnings)

    entry_lines = line_count(skill / "SKILL.md")
    check_size("SKILL.md lines", entry_lines, SKILL_LINE_BUDGET, SKILL_LINE_CAP, errors, warnings)
    for reference in sorted((skill / "references").glob("*.md")):
        check_size(f"{reference.name} lines", line_count(reference), REFERENCE_LINE_BUDGET, REFERENCE_LINE_CAP, errors, warnings)

    total_lines = sum(line_count(p) for p in skill.rglob("*.md"))
    if total_lines > DIRECTORY_LINE_BUDGET:
        warnings.append(f"*.md lines {total_lines} > budget {DIRECTORY_LINE_BUDGET}")

    pointed_at = check_pointers(skill, errors)
    for reference in sorted((skill / "references").rglob("*")):
        if reference.is_file() and reference not in pointed_at:
            warnings.append(f"orphan references/{reference.name}")

    return {
        "chars": len(description),
        "entry": entry_lines,
        "total": total_lines,
        "errors": errors,
        "warnings": warnings,
    }


def main(argv):
    wanted = set(argv[1:])
    skills = [p for p in sorted(skills_dir.iterdir()) if (p / "SKILL.md").exists()]
    if wanted:
        missing = wanted - {p.name for p in skills}
        if missing:
            print(f"unknown skill: {', '.join(sorted(missing))}")
            return 1
        skills = [p for p in skills if p.name in wanted]

    failed = description_chars = 0
    print(f"{'skill':34s} {'desc':>5s} {'entry':>6s} {'md':>6s}")
    for skill in skills:
        result = check(skill)
        print(f"{skill.name:34s} {result['chars']:5d} {result['entry']:6d} {result['total']:6d}")
        for warning in result["warnings"]:
            print(f"    warn  {warning}")
        for error in result["errors"]:
            print(f"    FAIL  {error}")
        failed += bool(result["errors"])
        description_chars += result["chars"]

    print(f"\n{len(skills)} skills, description load {description_chars} chars (~{description_chars // 4} tokens per session)")
    print("clean" if not failed else f"{failed} skill(s) failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
