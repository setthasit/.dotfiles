#!/usr/bin/env python3
import sys
from pathlib import Path

import ci_common

ci_common.render_home(Path(sys.argv[1]).resolve())
