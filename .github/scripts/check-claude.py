#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


EXACT_ID_OF_ALIASED_FAMILY = re.compile(r"^claude-(opus|sonnet|haiku)-")


def exact_id_effort_keys(settings):
    return [
        f"modelSettings key {key!r} is an exact model ID. Key it by the family alias instead"
        for key in settings.get("modelSettings", {})
        if EXACT_ID_OF_ALIASED_FAMILY.match(key)
    ]


def main():
    home = Path(sys.argv[1])
    settings = json.loads((home / ".claude/settings.json").read_text())

    failures = exact_id_effort_keys(settings)
    if failures:
        sys.exit("\n".join(f"FAIL: {failure}" for failure in failures))
    print("PASS: Claude Code keys every per-model effort setting by family alias where one exists")


if __name__ == "__main__":
    main()
