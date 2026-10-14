from pathlib import Path
import tomllib


AGENTS_FILE = Path(__file__).resolve().parents[2] / "home/.chezmoidata/agents.toml"
PINNED_PERMISSIONS = {
    "task": ":danger-full-access",
    "task-light": ":danger-full-access",
    "sonic": ":danger-full-access",
    "scout": "project-read",
    "reviewer": "project-read",
    "ship-reviewer": "project-read",
    "security-reviewer": "project-read",
    "tester": "project-read",
    "uxui-designer": ":danger-full-access",
    "uxui-design-review": "project-read",
    "planner": "project-edit",
    "coordinator": "project-edit",
}
PINNED_DELEGATES = {
    "planner": {"scout"},
    "coordinator": {"task", "task-light", "sonic", "scout", "reviewer", "ship-reviewer", "security-reviewer",
                    "tester", "uxui-designer", "uxui-design-review"},
}
PINNED_REVIEWERS = {"reviewer", "ship-reviewer", "security-reviewer"}
PINNED_BROWSER_ROLES = {"tester", "uxui-designer", "uxui-design-review"}
PINNED_TODOWRITE_ROLES = {"coordinator"}


def assert_pinned(key, actual, pinned):
    assert actual == pinned, f"{AGENTS_FILE.name} role {key} {actual} differ from the CI pin {pinned}"


def load():
    roles = tomllib.loads(AGENTS_FILE.read_text())["roles"]
    assert_pinned("permissions", {name: role["permissions"] for name, role in roles.items()}, PINNED_PERMISSIONS)
    delegates = {name: set(role["delegates"]) for name, role in roles.items() if role["delegates"]}
    assert_pinned("delegates", delegates, PINNED_DELEGATES)
    for flag, pinned in (("reviewer", PINNED_REVIEWERS), ("browser", PINNED_BROWSER_ROLES),
                         ("todowrite", PINNED_TODOWRITE_ROLES)):
        assert_pinned(flag, {name for name, role in roles.items() if role[flag]}, pinned)
    return roles


def split_frontmatter(path):
    text = Path(path).read_text()
    if not text.startswith("---\n"):
        return "", text
    block, closing, body = text[len("---\n"):].partition("\n---\n")
    if not closing:
        return "", text
    return block, body


def frontmatter(path):
    block, _ = split_frontmatter(path)
    fields = {}
    for line in block.splitlines():
        if line.startswith((" ", "-")):
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip().strip("\"'")
    return fields


def frontmatter_list(path, key):
    block, _ = split_frontmatter(path)
    items = []
    is_key_list = False
    for line in block.splitlines():
        if not line.startswith((" ", "-")):
            is_key_list = line.partition(":")[0].strip() == key
        elif is_key_list:
            items.append(line.strip().removeprefix("- ").strip())
    return items


def claude_definition(home, name):
    path = Path(home) / ".claude/agents" / f"{name}.md"
    _, body = split_frontmatter(path)
    return frontmatter_list(path, "skills"), body.strip()
