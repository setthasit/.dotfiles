#!/usr/bin/env python3
import fnmatch
import functools
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import tomllib


REPO = Path(__file__).resolve().parents[2]
SOURCE = REPO / "home"
ROLES = ("task", "sonic", "scout", "reviewer", "security-reviewer", "tester", "designer")
BROWSER_ROLES = ("tester", "designer")
WRITERS = ("task", "sonic")
BASH_CASES = {
    "git status --short": "ask",
    "git push origin feature": "ask",
    "git push -u origin feature": "ask",
    "git push origin main": "deny",
    "git push origin HEAD:main": "deny",
    "git push origin refs/heads/master": "deny",
    "git push -u origin master": "deny",
    "git push origin feature main": "deny",
    "git push --mirror origin": "deny",
    "git commit --no-verify -m fixture": "deny",
    "git -C project push origin main": "deny",
    "rm -rf /": "deny",
    "rm -rf ~": "deny",
    "/bin/rm -rf /": "deny",
    "mkfs.ext4 /dev/disposable": "deny",
    "dd if=fixture of=/dev/disposable": "deny",
    "shutdown now": "deny",
    "env": "deny",
    "printenv HOME": "deny",
    "cat nested/.env.local": "deny",
    "cat nested/id_ed25519": "deny",
    "security find-generic-password -s fixture": "deny",
    "terraform -chdir=infra destroy": "ask",
    "kubectl -n prod delete pod fixture": "ask",
    "docker compose down -v": "ask",
    "sudo ls": "ask",
    "npm install fixture": "ask",
    "npm publish": "ask",
    "gh pr merge 12": "ask",
    "git reset --hard HEAD": "ask",
    "python3 script.py": "ask",
    "psql postgres://localhost/app_dev": "ask",
}


def run_command(command, env, cwd):
    # OpenCode 1.18.34 truncates large JSON output when stdout is a pipe.
    with tempfile.TemporaryFile(mode="w+", dir=env["TMPDIR"]) as output:
        result = subprocess.run(command, env=env, cwd=cwd, text=True, stdout=output,
                                stderr=subprocess.PIPE, timeout=90)
        if result.returncode:
            raise subprocess.CalledProcessError(result.returncode, command, stderr=result.stderr)
        output.seek(0)
        return output.read()


def decision(rules, permission, pattern):
    action = "ask"
    for rule in rules:
        if fnmatch.fnmatchcase(permission, rule["permission"]) and fnmatch.fnmatchcase(pattern, rule["pattern"]):
            action = rule["action"]
    return action


def verify_agents(home, agents):
    policy = (home / ".config/ai/AGENTS.md").read_text()
    config_dir = home / ".config/opencode"
    assert (config_dir / "AGENTS.md").read_text().startswith(policy)
    assert {path.stem for path in (config_dir / "agents").glob("*.md")} == set(ROLES)
    for name in ROLES:
        agent = agents[name]
        codex = tomllib.loads((home / ".codex/agents" / f"{name}.toml").read_text())
        assert agent["mode"] == "subagent", (name, agent["mode"])
        assert agent["model"] == {"providerID": "openai", "modelID": codex["model"]}
        assert agent["variant"] == codex["model_reasoning_effort"]
        assert agent["prompt"].strip() == codex["developer_instructions"]
        rules = agent["permission"]
        assert decision(rules, "task", "task") == "deny"
        assert decision(rules, "todowrite", "*") == "deny"
        assert decision(rules, "edit", "ordinary.txt") == ("allow" if name in WRITERS else "deny")
        assert agent["tools"]["apply_patch"] is (name in WRITERS), (name, agent["tools"])
        assert decision(rules, "playwright_browser_navigate", "*") == ("allow" if name in BROWSER_ROLES else "deny")
        for command, expected in BASH_CASES.items():
            assert decision(rules, "bash", command) == expected, (name, command, expected)
        if name in {"reviewer", "security-reviewer"}:
            for tool in ("webfetch", "websearch", "Expo_write", "context7_query", "future_mcp_write"):
                assert decision(rules, tool, "*") == "deny", (name, tool)
    for profile, name in (("default", "build"), ("smol", "smol"), ("slow", "slow"), ("plan", "plan"), ("advisor", "advisor")):
        codex = tomllib.loads((home / ".codex" / f"{profile}.config.toml").read_text())
        agent = agents[name]
        assert agent["model"] == {"providerID": "openai", "modelID": codex["model"]}
        assert agent["variant"] == codex["model_reasoning_effort"]
        rules = agent["permission"]
        assert decision(rules, "task", "general") == "deny"
        assert decision(rules, "task", "build") == "deny"
        if name in {"plan", "advisor"}:
            assert decision(rules, "edit", "ordinary.txt") == "deny"
            assert decision(rules, "task", "task") == "deny"
            assert decision(rules, "task", "scout") == "allow"
    print("PASS: shared policy, seven role bodies and pins, five presets, and effective permissions")


def verify_secret_rules(home, agents):
    fixtures = [".env", ".env.local", ".env.example", "nested/.env", "nested/.env.template", "nested/key.pem",
                "nested/id_rsa_test", "nested/id_ed25519_test", "nested/id_ecdsa_test"]
    fixtures += [str(home / path) for path in (".aws/credentials", ".ssh/id_rsa", ".netrc", ".zshrc.local",
                                               ".claude.json", ".codex/auth.json", ".local/share/opencode/auth.json")]
    fixtures += [os.path.relpath(path, home.parent / "project") for path in fixtures if Path(path).is_absolute()]
    for name, agent in agents.items():
        for fixture in fixtures:
            assert decision(agent["permission"], "read", fixture) == "deny", (name, fixture)
        assert decision(agent["permission"], "edit", str(home / ".config/opencode/opencode.json")) == "deny"
        assert decision(agent["permission"], "edit", "../home/.config/opencode/AGENTS.md") == "deny"
    print("PASS: secret file denies and protected live configuration on every agent")


def verify_file_tools(run, env, project, home):
    ordinary = project / "ordinary.txt"
    ordinary.write_text("disposable fixture\n")
    run(["opencode", "debug", "agent", "scout", "--tool", "read", "--params", json.dumps({"filePath": str(ordinary)})])
    for secret in (project / ".env", home / ".netrc", home / ".aws/credentials"):
        secret.parent.mkdir(parents=True, exist_ok=True)
        secret.write_text("disposable placeholder\n")
        denied = subprocess.run(["opencode", "debug", "agent", "task", "--tool", "read", "--params",
                                 json.dumps({"filePath": str(secret)})], env=env, cwd=project, text=True,
                                capture_output=True, timeout=90)
        assert denied.returncode != 0 and "disposable placeholder" not in denied.stdout, secret
        assert "a rule which prevents you from using this specific tool call" in denied.stderr, denied.stderr
    patch = "*** Begin Patch\n*** Update File: ordinary.txt\n@@\n-disposable fixture\n+changed fixture\n*** End Patch"
    readonly = subprocess.run(["opencode", "debug", "agent", "reviewer", "--tool", "apply_patch", "--params",
                               json.dumps({"patchText": patch})], env=env, cwd=project, text=True,
                              capture_output=True, timeout=90)
    assert readonly.returncode != 0 and ordinary.read_text() == "disposable fixture\n"
    assert "disabled" in readonly.stderr.lower(), readonly.stderr
    target = home / ".config/opencode/AGENTS.md"
    original = target.read_text()
    patch = f"*** Begin Patch\n*** Update File: {target}\n@@\n-# OpenCode host map\n+# Changed host map\n*** End Patch"
    protected = subprocess.run(["opencode", "debug", "agent", "task", "--tool", "apply_patch", "--params",
                                json.dumps({"patchText": patch})], env=env, cwd=project, text=True,
                               capture_output=True, timeout=90)
    assert protected.returncode != 0 and target.read_text() == original, "live host policy was writable"
    assert "a rule which prevents you from using this specific tool call" in protected.stderr, protected.stderr
    print("PASS: native reads, secret rejection, read-only reviewer tools, and protected live policy")


def main():
    scratch_root = os.environ.get("TMPDIR", tempfile.gettempdir())
    with tempfile.TemporaryDirectory(prefix="opencode-dotfiles-", dir=scratch_root) as directory:
        scratch = Path(directory).resolve()
        home, project = scratch / "home", scratch / "project"
        home.mkdir()
        project.mkdir()
        env = {key: os.environ[key] for key in ("PATH", "LANG", "LC_ALL") if key in os.environ}
        env.update(HOME=str(home), TMPDIR=str(scratch), XDG_CONFIG_HOME=str(home / ".config"),
                   XDG_DATA_HOME=str(home / ".local/share"), XDG_STATE_HOME=str(home / ".local/state"),
                   XDG_CACHE_HOME=str(home / ".cache"))
        run = functools.partial(run_command, env=env, cwd=project)
        chezmoi_config = shutil.copyfile(REPO / ".github/chezmoi-ci.toml", scratch / "chezmoi.toml")
        run(["chezmoi", f"--config={chezmoi_config}", f"--source={REPO}", f"--destination={home}",
             "--no-tty", "apply", "--exclude=externals,scripts"])
        pin = tomllib.loads((SOURCE / "dot_config/mise/config.toml").read_text())["tools"]["opencode"]
        assert run(["opencode", "--version"]).strip() == pin
        config = json.loads((home / ".config/opencode/opencode.json").read_text())
        assert config["autoupdate"] is False and config["share"] == "disabled"
        assert config["subagent_depth"] == 1
        assert config["experimental"]["continue_loop_on_deny"] is False
        servers = config["mcp"]
        assert set(servers) == {"Expo", "Notion", "context7", "playwright"}
        for name, variable in (("Expo", "EXPO_TOKEN"), ("context7", "CONTEXT7_TOKEN")):
            assert servers[name]["headers"]["Authorization"] == f"Bearer {{env:{variable}}}"
            assert servers[name]["oauth"] is False
        assert "oauth" not in servers["Notion"]
        browser = tomllib.loads((home / ".codex/agents/tester.toml").read_text())["mcp_servers"]["playwright"]
        assert servers["playwright"]["command"] == [browser["command"], *browser["args"]]
        tui = json.loads((home / ".config/opencode/tui.json").read_text())
        assert tui["attention"] == {"enabled": True, "notifications": True, "sound": False}
        env["OPENCODE_CONFIG_CONTENT"] = json.dumps({"mcp": {name: {"enabled": False} for name in servers}})
        resolved = json.loads(run(["opencode", "debug", "config"]))
        assert resolved["model"] == config["model"]
        assert resolved["small_model"] == config["small_model"]
        assert resolved["agent"]["general"]["disable"] is True
        assert resolved["agent"]["explore"]["disable"] is True
        agents = {name: json.loads(run(["opencode", "debug", "agent", name]))
                  for name in (*ROLES, "build", "smol", "slow", "plan", "advisor")}
        verify_agents(home, agents)
        verify_secret_rules(home, agents)
        skills = json.loads(run(["opencode", "debug", "skill"]))
        expected = {path.parent.name for path in (SOURCE / "dot_agents/skills").glob("*/SKILL.md")}
        assert expected <= {skill["name"] for skill in skills}
        print("PASS: pinned CLI native config/agent loading and shared skill discovery")
        verify_file_tools(run, env, project, home)
        print("NOT VERIFIED: model requests, MCP authentication, browser operation, and terminal notifications")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(f"FAIL: {error.cmd}: {error.stderr}")
