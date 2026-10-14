from collections import namedtuple
from contextlib import contextmanager
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import tomllib

if not __debug__:
    sys.exit("FAIL: the CI checks are assert statements, which python3 -O and PYTHONOPTIMIZE strip. Run without them.")

REPO = Path(__file__).resolve().parents[2]
SOURCE = REPO / "home"
CHEZMOI_CONFIG = REPO / ".github/chezmoi-ci.toml"
INHERITED_ENV = ("PATH", "LANG", "LC_ALL")

Sandbox = namedtuple("Sandbox", "home project env")


def mise_pin(tool):
    return tomllib.loads((SOURCE / "dot_config/mise/config.toml").read_text())["tools"][tool]


def shared_skills():
    return {path.parent.name for path in (SOURCE / "dot_agents/skills").glob("*/SKILL.md")}


def render_home(home, env=None):
    if home.exists() and any(home.iterdir()):
        sys.exit(f"refusing to render into non-empty {home}")
    home.mkdir(parents=True, exist_ok=True)
    state = home.parent / "chezmoi-state.boltdb"
    # Externals clone over the network and scripts install packages.
    subprocess.run(["chezmoi", f"--config={CHEZMOI_CONFIG}", f"--persistent-state={state}", f"--source={REPO}",
                    f"--destination={home}", "--no-tty", "apply", "--force", "--exclude=externals,scripts"],
                   env=env, check=True)


def isolated_env(home, tmp):
    env = {key: os.environ[key] for key in INHERITED_ENV if key in os.environ}
    env.update(HOME=str(home), TMPDIR=str(tmp), XDG_CONFIG_HOME=str(home / ".config"),
               XDG_DATA_HOME=str(home / ".local/share"), XDG_STATE_HOME=str(home / ".local/state"),
               XDG_CACHE_HOME=str(home / ".cache"))
    return env


@contextmanager
def rendered_sandbox(prefix):
    with tempfile.TemporaryDirectory(prefix=prefix) as directory:
        scratch = Path(directory).resolve()
        home, project, tmp = scratch / "home", scratch / "project", scratch / "tmp"
        project.mkdir()
        tmp.mkdir()
        env = isolated_env(home, tmp)
        render_home(home, env)
        yield Sandbox(home, project, env)
