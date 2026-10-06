import json
import shutil
import subprocess
import sys
import tempfile
import tomllib
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
TEMPLATE = REPO / "home/run_onchange_after_40-claude-mcp.sh.tmpl"
CI_CONFIG = REPO / ".github/chezmoi-ci.toml"
MANAGED_SERVERS = tomllib.loads((REPO / "home/.chezmoidata/mcp.toml").read_text(encoding="utf-8"))["mcpServers"]
MANAGED_NAMES = {server["name"] for server in MANAGED_SERVERS}
TOKEN_SERVER = next(server for server in MANAGED_SERVERS if "tokenEnv" in server)
CHEZMOI = shutil.which("chezmoi")
JQ = shutil.which("jq")

FAKE_CLAUDE = """\
#!{python}
import json, sys
with open({log!r}, "a", encoding="utf-8") as log:
    log.write(json.dumps(sys.argv[1:]) + "\\n")
sys.exit({exit_code})
"""

HAND_ADDED = {"hand-added": {"type": "http", "url": "https://hand.example/mcp"}}
SERVER_NAME_INDEX = {"get": 2, "remove": 4, "add": 6}


def bearer(token_env):
    return "Bearer ${" + token_env + "}"


def stored_entry(server):
    entry = {"type": "http", "url": server["url"]}
    if "tokenEnv" in server:
        entry["headers"] = {"Authorization": bearer(server["tokenEnv"])}
    return entry


def stored_entries(servers):
    return {server["name"]: stored_entry(server) for server in servers}


def entries_with_old_url():
    return {server["name"]: {**stored_entry(server), "url": "https://old.example/mcp"} for server in MANAGED_SERVERS}


def remove_call(server):
    return ["mcp", "remove", "--scope", "user", server["name"]]


def add_call(server):
    call = ["mcp", "add", "--scope", "user", "--transport", "http", server["name"], server["url"]]
    if "tokenEnv" in server:
        call += ["--header", "Authorization: " + bearer(server["tokenEnv"])]
    return call


def server_name(call):
    verb = call[1]
    return call[SERVER_NAME_INDEX[verb]]


class ClaudeMcpScriptTest(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(CHEZMOI, "chezmoi must be on PATH to render the script")
        self.assertIsNotNone(JQ, "jq must be on PATH to run the script")
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        self.bin_dir = root / "bin"
        self.home = root / "home"
        self.config = root / "chezmoi.toml"
        self.log = root / "claude.log"
        self.script = root / "claude-mcp.sh"
        self.bin_dir.mkdir()
        self.home.mkdir()
        shutil.copyfile(CI_CONFIG, self.config)

    def write_claude_config(self, servers):
        (self.home / ".claude.json").write_text(json.dumps({"mcpServers": servers}), encoding="utf-8")

    def install_fake_claude(self, exit_code, path):
        fake = self.bin_dir / "claude"
        fake.write_text(FAKE_CLAUDE.format(python=sys.executable, log=str(self.log), exit_code=exit_code), encoding="utf-8")
        fake.chmod(0o755)
        self.assertEqual(shutil.which("claude", path=path), str(fake))

    def render_script(self, env):
        command = [CHEZMOI, f"--config={self.config}", f"--source={REPO}", f"--destination={self.home}", "--no-tty", "execute-template"]
        with TEMPLATE.open(encoding="utf-8") as template:
            rendered = subprocess.run(command, stdin=template, capture_output=True, text=True, env=env)
        self.assertEqual(rendered.returncode, 0, rendered.stderr)
        self.script.write_text(rendered.stdout, encoding="utf-8")

    def run_script(self, claude_exit_code=0, with_jq=True):
        if with_jq:
            (self.bin_dir / "jq").symlink_to(JQ)
            path = f"{self.bin_dir}:/usr/bin:/bin"
        else:
            path = str(self.bin_dir)
            self.assertIsNone(shutil.which("jq", path=path))
        env = {"PATH": path, "HOME": str(self.home)}
        self.install_fake_claude(claude_exit_code, path)
        self.render_script(env)
        result = subprocess.run(["/bin/sh", str(self.script)], capture_output=True, text=True, env=env)
        calls = []
        if self.log.exists():
            calls = [json.loads(line) for line in self.log.read_text(encoding="utf-8").splitlines()]
        return result, calls

    def test_unchanged_servers_are_left_untouched(self):
        self.write_claude_config(stored_entries(MANAGED_SERVERS))
        result, calls = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls, [])

    def test_changed_url_is_removed_then_added_with_the_new_url(self):
        self.write_claude_config(entries_with_old_url())
        result, calls = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        expected = [call for server in MANAGED_SERVERS for call in (remove_call(server), add_call(server))]
        self.assertEqual(calls, expected)

    def test_changed_token_variable_is_removed_then_added_with_the_new_header(self):
        servers = stored_entries(MANAGED_SERVERS)
        servers[TOKEN_SERVER["name"]]["headers"] = {"Authorization": bearer("OLD_TOKEN")}
        self.write_claude_config(servers)
        result, calls = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls, [remove_call(TOKEN_SERVER), add_call(TOKEN_SERVER)])

    def test_absent_servers_are_added(self):
        self.write_claude_config(HAND_ADDED)
        result, calls = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls, [add_call(server) for server in MANAGED_SERVERS])

    def test_no_call_names_a_server_outside_the_managed_list(self):
        self.write_claude_config({**HAND_ADDED, **entries_with_old_url()})
        _, calls = self.run_script()
        self.assertTrue(calls)
        self.assertLessEqual({server_name(call) for call in calls}, MANAGED_NAMES)

    def test_failed_add_exits_non_zero_and_names_the_server(self):
        self.write_claude_config({})
        result, calls = self.run_script(claude_exit_code=1)
        first = MANAGED_SERVERS[0]
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(f"failed to register MCP server {first['name']}", result.stderr)
        self.assertEqual(calls, [add_call(first)])

    def test_without_jq_a_registered_server_is_left_untouched(self):
        self.write_claude_config({})
        result, calls = self.run_script(with_jq=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(calls, [["mcp", "get", server["name"]] for server in MANAGED_SERVERS])


if __name__ == "__main__":
    unittest.main()
