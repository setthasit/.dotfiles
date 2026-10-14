from pathlib import Path
import tomllib


DATA_DIR = Path(__file__).resolve().parents[2] / "home/.chezmoidata"
SECRETS_FILE = DATA_DIR / "sensitive-paths.toml"
PROTECTED_CONFIG_FILE = DATA_DIR / "protected-config.toml"
DIRECTORY_PREFIXES = ("", "nested/", "nested/deeper/")
REQUIRED_ENTRIES = {
    "homeDirs": {".ssh", ".aws", ".gnupg", ".kube", ".config/gh"},
    "homeFiles": {".netrc", ".zshrc.local", ".claude.json", ".codex/auth.json", ".local/share/opencode/auth.json",
                  ".local/share/opencode/mcp-auth.json"},
    "fileGlobs": {".env", ".env.*", "*.pem", "id_rsa*", "id_ecdsa*", "id_ed25519*"},
    "readable": {".env.example", ".env.sample", ".env.template"},
}

REQUIRED_PROTECTED = {
    "files": {".claude/settings*.json", ".claude/CLAUDE.md", ".config/ai/AGENTS.md"},
    "dirs": {".claude/agents", ".claude/hooks", ".claude/mods", ".codex", ".config/opencode", ".agents/skills"},
}


def load():
    secrets = tomllib.loads(SECRETS_FILE.read_text())["secrets"]
    for key, required in REQUIRED_ENTRIES.items():
        missing = required - set(secrets[key])
        assert not missing, f"{SECRETS_FILE.name} [secrets].{key} lost {sorted(missing)}"
    return secrets


def load_protected_config():
    protected = tomllib.loads(PROTECTED_CONFIG_FILE.read_text())["protectedConfig"]
    for key, required in REQUIRED_PROTECTED.items():
        missing = required - set(protected[key])
        assert not missing, f"{PROTECTED_CONFIG_FILE.name} [protectedConfig].{key} lost {sorted(missing)}"
    return protected


def at_every_depth(names):
    return [prefix + name for name in names for prefix in DIRECTORY_PREFIXES]


def fixtures(home):
    secrets = load()
    file_names = [glob.replace("*", "fixture") for glob in secrets["fileGlobs"]]
    denied = at_every_depth(file_names)
    for directory in secrets["homeDirs"]:
        for name in ("fixture", *secrets["readable"]):
            denied += [f"{directory}/{name}", str(Path(home) / directory / name)]
    denied += [str(Path(home) / file) for file in secrets["homeFiles"]]
    return denied, at_every_depth(secrets["readable"])
