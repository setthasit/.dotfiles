#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

import ci_common

for tool in sys.argv[1:]:
    pinned = f"{tool}@{ci_common.mise_pin(tool)}"
    subprocess.run(["mise", "install", pinned], stdout=sys.stderr, check=True)
    location = Path(subprocess.run(["mise", "where", pinned], capture_output=True, text=True, check=True).stdout.strip())
    if (location / "bin").is_dir():
        location = location / "bin"
    print(location)
