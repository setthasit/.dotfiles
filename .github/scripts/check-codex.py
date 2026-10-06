#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path
import queue
import re
import shutil
import subprocess
import tempfile
import threading
import tomllib

import secret_paths

REPO = Path(__file__).resolve().parents[2]
SOURCE = REPO / "home"
ROLES = {
    "task": ("gpt-6.1-sol", "high", ":danger-full-access"),
    "sonic": ("gpt-6-luna", "high", ":danger-full-access"),
    "scout": ("gpt-6-luna", "high", "project-read"),
    "reviewer": ("gpt-6.1-sol", "xhigh", "project-read"),
    "security-reviewer": ("gpt-6.1-sol", "xhigh", "project-read"),
    "tester": ("gpt-6-luna", "high", "project-read"),
    "uxui-designer": ("gpt-6.1-sol", "high", ":danger-full-access"),
    "uxui-design-review": ("gpt-6.1-sol", "high", "project-read"),
}
BROWSER_ROLES = ("tester", "uxui-designer", "uxui-design-review")
PROFILES = {
    "default": ("gpt-6.1-sol", "high"),
    "smol": ("gpt-6-luna", "high"),
    "slow": ("gpt-6.1-sol", "xhigh"),
    "plan": ("gpt-6-astra", "xhigh"),
    "advisor": ("gpt-6-astra", "xhigh"),
}


def run(command, env, cwd, check=True):
    result = subprocess.run(command, env=env, cwd=cwd, text=True, capture_output=True, timeout=30)
    if check and result.returncode:
        raise AssertionError(f"{command}: {result.stderr}")
    return result


def read_toml(path):
    return tomllib.loads(path.read_text())


def verify_render(home):
    codex_home = home / ".codex"
    for path in codex_home.rglob("*.toml"):
        read_toml(path)
    config = read_toml(codex_home / "config.toml")
    policy = (home / ".config/ai/AGENTS.md").read_text()
    autonomy = config["auto_review"]["extra_policy"]
    assert (codex_home / "AGENTS.md").read_text().startswith(policy)
    assert autonomy.startswith("## Autonomy\n") and autonomy in policy
    assert "## Gates\n" not in policy
    assert "Adding, removing, or upgrading a dependency needs approval" not in policy
    assert "policy" not in config["auto_review"], "built-in reviewer policy must remain active"
    assert config["approval_policy"] == "on-request"
    assert config["approvals_reviewer"] == "auto_review"
    assert config["default_permissions"] == ":danger-full-access"
    assert "sandbox_mode" not in config
    assert config["permissions"]["project-edit"]["network"]["enabled"] is True
    assert config["permissions"]["project-read"]["network"]["enabled"] is False
    assert config["permissions"]["project-edit"]["extends"] == ":workspace"
    assert config["permissions"]["project-read"]["extends"] == "project-edit"
    assert set(path.stem for path in (codex_home / "agents").glob("*.toml")) == set(ROLES)
    for name, (model, effort, permissions) in ROLES.items():
        role = read_toml(codex_home / "agents" / f"{name}.toml")
        source = (SOURCE / "dot_claude/agents" / f"{name}.md").read_text()
        body = re.sub(r"\A---\n.*?\n---\n", "", source, count=1, flags=re.S).strip()
        assert role["name"] == name
        assert role["model"] == model and role["model_reasoning_effort"] == effort
        assert role["default_permissions"] == permissions
        assert role["developer_instructions"] == body
        assert role["agents"]["enabled"] is False
        servers = role.get("mcp_servers", {})
        assert ("playwright" in servers) == (name in BROWSER_ROLES)
        if name in {"reviewer", "security-reviewer"}:
            assert role["web_search"] == "disabled"
            assert all(servers[server]["enabled"] is False for server in config["mcp_servers"])
    browsers = [read_toml(codex_home / "agents" / f"{name}.toml")["mcp_servers"]["playwright"] for name in BROWSER_ROLES]
    assert all(browser == browsers[0] for browser in browsers), "browser roles pin different Playwright servers"
    for name, (model, effort) in PROFILES.items():
        profile = read_toml(codex_home / f"{name}.config.toml")
        assert profile == {"model": model, "model_reasoning_effort": effort}
    assert not (codex_home / "auth.json").exists()
    assert not (codex_home / "hooks.json").exists()
    assert not (codex_home / "rules/default.rules").exists()
    print("PASS: rendered config, shared policy, eight roles, five profiles, and MCP placement")


def verify_rpc(env, project, scratch):
    messages = queue.Queue()
    with (scratch / "app-server.stderr").open("w+") as errors:
        server = subprocess.Popen(
            ["codex", "app-server", "--strict-config"], env=env, cwd=project,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=errors, text=True,
        )

        def receive():
            for line in server.stdout:
                messages.put(json.loads(line))
            messages.put(None)

        reader = threading.Thread(target=receive, daemon=True)
        reader.start()

        def request(identifier, method, params):
            server.stdin.write(json.dumps({"id": identifier, "method": method, "params": params}) + "\n")
            server.stdin.flush()
            while True:
                message = messages.get(timeout=15)
                assert message is not None, "app-server exited before replying"
                assert message.get("method") != "configWarning", message
                if message.get("id") == identifier:
                    assert "error" not in message, message
                    return message["result"]

        try:
            request(1, "initialize", {"clientInfo": {"name": "dotfiles-check", "version": "1"}})
            server.stdin.write('{"method":"initialized"}\n')
            server.stdin.flush()
            response = request(2, "config/read", {"includeLayers": True})
            config = response["config"]
            assert config["model"] == "gpt-6.1-sol"
            assert config["model_reasoning_effort"] == "high"
            assert config["approval_policy"] == "on-request"
            assert config["approvals_reviewer"] == "auto_review"
            assert config["default_permissions"] == ":danger-full-access"
            skills = request(3, "skills/list", {"cwds": [str(project)], "forceReload": True})
            discovered = {item["name"]: item for data in skills["data"] for item in data["skills"]}
            expected = {path.parent.name for path in (SOURCE / "dot_agents/skills").glob("*/SKILL.md")}
            assert expected <= discovered.keys(), expected - discovered.keys()
            assert all(discovered[name]["enabled"] for name in expected)
        finally:
            server.terminate()
            server.wait(timeout=5)
            server.stdin.close()
            server.stdout.close()
            reader.join(timeout=5)
            errors.seek(0)
            assert not errors.read().strip(), "app-server emitted configuration errors"
    for profile in PROFILES:
        result = run(["codex", "--profile", profile, "mcp", "list", "--json"], env, project)
        servers = {item["name"]: item for item in json.loads(result.stdout)}
        assert set(servers) == {"Expo", "Notion", "context7"}
        assert servers["Expo"]["transport"]["bearer_token_env_var"] == "EXPO_TOKEN"
        assert servers["context7"]["transport"]["bearer_token_env_var"] == "CONTEXT7_TOKEN"
    print("PASS: pinned CLI strict config loading, custom-agent discovery, shared skills, and profile loading")


def verify_sandbox(env, project):
    readable = project / "ordinary.txt"
    readable.write_text("disposable fixture\n")
    denied_fixtures, env_templates = secret_paths.fixtures(env["HOME"])
    # Codex 0.159 rejects `read` on a glob path, so env templates stay under the `.env.*` deny.
    denied_paths = [project / fixture for fixture in denied_fixtures + env_templates]
    for path in denied_paths:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("disposable placeholder\n")
    command = ["codex", "sandbox", "--cd", str(project), "--permission-profile"]
    result = run([*command, "project-edit", "/bin/cat", str(readable)], env, project, check=False)
    assert result.returncode == 0, f"sandbox unavailable: {result.stderr}"
    for profile in ("project-edit", "project-read"):
        for path in denied_paths:
            denied = run([*command, profile, "/bin/cat", str(path)], env, project, check=False)
            assert denied.returncode != 0 and not denied.stdout, ("codex", profile, path, denied)
        scratch_file = str(Path(env["TMPDIR"]) / f"{profile}.txt")
        run([*command, profile, "/usr/bin/touch", scratch_file], env, project)
    writable = str(project / "writer.txt")
    run([*command, "project-edit", "/usr/bin/touch", writable], env, project)
    denied = run([*command, "project-read", "/usr/bin/touch", str(project / "reader.txt")], env, project, check=False)
    assert denied.returncode != 0, "read-only role could write project files"
    for path in ["config.toml", "rules/managed.rules", "agents/task.toml", "AGENTS.md", "slow.config.toml"]:
        denied = run([*command, "project-edit", "/usr/bin/touch", str(Path(env["CODEX_HOME"]) / path)], env, project, check=False)
        assert denied.returncode != 0, f"live safety config was writable: {path}"
    print("PASS: optional sandbox secret denies, project writes, read-only roles, temp writes, and protected config")
    print("FULL ACCESS: default session and writer roles have no filesystem or network sandbox")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-sandbox", action="store_true", help="Check config and policy only. Filesystem enforcement remains unverified.")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="codex-dotfiles-", dir=os.environ.get("TMPDIR")) as directory:
        scratch = Path(directory).resolve()
        home, project = scratch / "home", scratch / "project"
        home.mkdir()
        project.mkdir()
        (scratch / "tmp").mkdir()
        env = {key: os.environ[key] for key in ("PATH", "LANG", "LC_ALL") if key in os.environ}
        env.update(HOME=str(home), CODEX_HOME=str(home / ".codex"), TMPDIR=str(scratch / "tmp"),
                   XDG_CONFIG_HOME=str(home / ".config"), XDG_CACHE_HOME=str(scratch / "cache"))
        config = shutil.copy(REPO / ".github/chezmoi-ci.toml", scratch / "chezmoi.toml")
        run(["chezmoi", f"--config={config}", f"--source={REPO}", f"--destination={home}",
             "--no-tty", "apply", "--exclude=externals,scripts"], env, project)
        pin = read_toml(SOURCE / "dot_config/mise/config.toml")["tools"]["codex"]
        assert run(["codex", "--version"], env, project).stdout.strip() == f"codex-cli {pin}"
        verify_render(home)
        approvals = run(["python3", str(REPO / ".github/scripts/check-approvals.py"), str(home)], env, project)
        print(approvals.stdout.strip())
        skills = run(["python3", str(home / ".agents/skills/writing-for-agents/scripts/check_skills.py")], env, project)
        print(skills.stdout.strip())
        verify_rpc(env, project, scratch)
        if args.skip_sandbox:
            print("NOT VERIFIED: filesystem sandbox enforcement (--skip-sandbox)")
        else:
            verify_sandbox(env, project)


if __name__ == "__main__":
    main()
