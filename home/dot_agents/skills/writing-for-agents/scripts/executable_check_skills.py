#!/usr/bin/env python3
"""Audit skill directories against the budgets and pointer rules in SKILL.md."""

import json
import re
import sys
from pathlib import Path

DESCRIPTION_BUDGET, DESCRIPTION_CAP = 400, 600
SKILL_LINE_BUDGET = 150
REFERENCE_LINE_BUDGET = 120
DIRECTORY_LINE_BUDGET = 800
AUTHORED_KEYS = {"name", "description"}
VENDOR_KEYS = {"license", "metadata", "compatibility"}

LOCAL_POINTER = re.compile(r"(?<![\w/])(?:references|scripts|assets)/[A-Za-z0-9_.\-/]+")
SKILL_POINTER = re.compile(r"skill://([a-z0-9][a-z0-9-]*)((?:/[A-Za-z0-9_.\-/]+)?)")

root = Path(__file__).resolve().parents[3]
skills_dir = root / "skills"


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
            fields[key] = match.group(2).strip().lstrip(">|").strip().strip('"\'')
        elif key and line.strip():
            fields[key] = (fields[key] + " " + line.strip()).strip().strip('"\'')
    return fields


def line_count(path):
    return len(path.read_text(encoding="utf-8").splitlines())


def upstream_names():
    names = set()
    lock = root / ".skill-lock.json"
    if lock.exists():
        names |= set(json.loads(lock.read_text(encoding="utf-8")).get("skills", {}))
    source = root / "skills-src"
    if source.is_dir():
        names |= {p.name for p in source.iterdir() if p.is_dir()}
    return names


def check_pointers(skill, errors):
    pointed_at = set()
    for doc in sorted(skill.rglob("*.md")):
        body = doc.read_text(encoding="utf-8")
        for target in LOCAL_POINTER.findall(body):
            resolved = skill / target.rstrip(".,);:`")
            pointed_at.add(resolved)
            if not resolved.exists():
                errors.append(f"{doc.name} points at missing {target}")
        for name, inner in SKILL_POINTER.findall(body):
            target = skills_dir / name / inner.strip("/").rstrip(".,);:`")
            if not (skills_dir / name).is_dir():
                errors.append(f"{doc.name} points at unknown skill://{name}")
            elif inner and not target.exists():
                errors.append(f"{doc.name} points at missing skill://{name}{inner}")
    return pointed_at


def check(skill, upstream):
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

    vendored = skill.name in upstream or bool(set(fields) & VENDOR_KEYS)
    if not vendored:
        for key in set(fields) - AUTHORED_KEYS:
            warnings.append(f"unknown frontmatter key {key!r}")

    if len(description) > DESCRIPTION_CAP:
        errors.append(f"description {len(description)} chars > cap {DESCRIPTION_CAP}")
    elif len(description) > DESCRIPTION_BUDGET:
        warnings.append(f"description {len(description)} chars > budget {DESCRIPTION_BUDGET}")

    entry_lines = line_count(skill / "SKILL.md")
    if entry_lines > SKILL_LINE_BUDGET:
        warnings.append(f"SKILL.md {entry_lines} lines > budget {SKILL_LINE_BUDGET}")
    for reference in sorted((skill / "references").glob("*.md")):
        if line_count(reference) > REFERENCE_LINE_BUDGET:
            warnings.append(f"{reference.name} {line_count(reference)} lines > budget {REFERENCE_LINE_BUDGET}")

    total_lines = sum(line_count(p) for p in skill.rglob("*.md"))
    if total_lines > DIRECTORY_LINE_BUDGET:
        warnings.append(f"directory {total_lines} lines > budget {DIRECTORY_LINE_BUDGET}")

    pointed_at = check_pointers(skill, errors)
    for reference in sorted((skill / "references").rglob("*")):
        if reference.is_file() and reference not in pointed_at:
            warnings.append(f"orphan references/{reference.name}")

    if vendored:
        warnings.extend(errors)
        errors = []
    return {
        "kind": "vendored" if vendored else "authored",
        "chars": len(description),
        "entry": entry_lines,
        "total": total_lines,
        "errors": errors,
        "warnings": warnings,
    }


def main(argv):
    upstream = upstream_names()
    wanted = set(argv[1:])
    skills = [p for p in sorted(skills_dir.iterdir()) if (p / "SKILL.md").exists()]
    if wanted:
        missing = wanted - {p.name for p in skills}
        if missing:
            print(f"unknown skill: {', '.join(sorted(missing))}")
            return 1
        skills = [p for p in skills if p.name in wanted]

    failed = authored_chars = 0
    print(f"{'skill':34s} {'kind':9s} {'desc':>5s} {'entry':>6s} {'dir':>6s}")
    for skill in skills:
        result = check(skill, upstream)
        print(f"{skill.name:34s} {result['kind']:9s} {result['chars']:5d} {result['entry']:6d} {result['total']:6d}")
        for warning in result["warnings"]:
            print(f"    warn  {warning}")
        for error in result["errors"]:
            print(f"    FAIL  {error}")
        failed += bool(result["errors"])
        if result["kind"] == "authored":
            authored_chars += result["chars"]

    print(f"\n{len(skills)} skills, authored description load {authored_chars} chars (~{authored_chars // 4} tokens per session)")
    print("clean" if not failed else f"{failed} skill(s) failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
