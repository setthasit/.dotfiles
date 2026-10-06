#!/usr/bin/env python3
import fnmatch
from itertools import zip_longest
import json
import re
import sys
from pathlib import Path

import secret_paths


EXACT_ID_OF_ALIASED_FAMILY = re.compile(r"^claude-(opus|sonnet|haiku)-")


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

    failures = exact_id_effort_keys(settings) + secret_read_failures(settings["permissions"]["deny"])
    if failures:
        sys.exit("\n".join(f"FAIL: {failure}" for failure in failures))
    print("PASS: Claude Code keys every per-model effort setting by family alias where one exists")
    print("PASS: Claude Code read denies match the shared secret-path list, rule for rule and in order")
    print("NOT VERIFIED: Claude Code read decisions. These checks are structural because CI has no Claude CLI")


if __name__ == "__main__":
    main()
