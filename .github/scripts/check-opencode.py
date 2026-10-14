#!/usr/bin/env python3
import fnmatch
import functools
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import tomllib

import agent_roles
import ci_common
from command_tiers import CASES
import secret_paths
from opencode_task_fixture import verify_task_runtime

ROLES = agent_roles.load()
RULE_DENIED = "a rule which prevents you from using this specific tool call"
TOOL_DISABLED = "disabled"


def run_command(command, env, cwd):
    # The pinned OpenCode CLI truncates JSON output at 64 KiB when stdout is a pipe.
    with tempfile.TemporaryFile(mode="w+", dir=env["TMPDIR"]) as output:
        result = subprocess.run(command, env=env, cwd=cwd, text=True, stdout=output,
                                stderr=subprocess.PIPE, timeout=90)
        if result.returncode:
            raise subprocess.CalledProcessError(result.returncode, command, stderr=result.stderr)
        output.seek(0)
        return output.read()


def run_tool(sandbox, agent, tool, params):
    return subprocess.run(["opencode", "debug", "agent", agent, "--tool", tool, "--params", json.dumps(params)],
                          env=sandbox.env, cwd=sandbox.project, text=True, capture_output=True, timeout=90)


def assert_refused(result, reason, context):
    assert result.returncode != 0, (context, "tool call was allowed")
    assert reason in result.stderr, (context, result.stderr)


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
    rendered_roles = {path.stem for path in (config_dir / "agents").glob("*.md")}
    assert rendered_roles == set(ROLES), ("OpenCode", "missing or extra roles", sorted(rendered_roles ^ set(ROLES)))
    for name in ROLES:
        agent = agents[name]
        codex = tomllib.loads((home / ".codex/agents" / f"{name}.toml").read_text())
        assert agent["mode"] == "subagent", (name, agent["mode"])
        assert agent["model"] == {"providerID": "openai", "modelID": codex["model"]}
        assert agent["variant"] == codex["model_reasoning_effort"], ("OpenCode", name, "variant", agent["variant"])
        assert agent["prompt"].strip() == codex["developer_instructions"]
        rules = agent["permission"]
        assert decision(rules, "grep", "fixture") == "allow"
        assert decision(rules, "external_directory", "/tmp/disposable") == "allow"
        assert decision(rules, "doom_loop", "*") == "deny"
        delegates = agent_roles.PINNED_DELEGATES.get(name, set())
        for target in (*ROLES, "build", "plan", "advisor", "general", "explore", "unknown"):
            expected = "allow" if target in delegates else "deny"
            assert decision(rules, "task", target) == expected, (name, target, expected)
        assert agent["tools"]["task"] is bool(delegates), (name, "task tool")
        assert decision(rules, "todowrite", "*") == ("allow" if name in agent_roles.PINNED_TODOWRITE_ROLES else "deny")
        editable = agent_roles.PINNED_PERMISSIONS[name] != "project-read"
        assert decision(rules, "edit", "ordinary.txt") == ("allow" if editable else "deny")
        assert agent["tools"]["apply_patch"] is editable, (name, agent["tools"])
        browser = "allow" if name in agent_roles.PINNED_BROWSER_ROLES else "deny"
        assert decision(rules, "playwright_browser_navigate", "*") == browser, (name, "browser")
        for command, _, _, expected in CASES:
            assert decision(rules, "bash", command) == expected, (name, command, expected)
        if name in agent_roles.PINNED_REVIEWERS:
            for tool in ("webfetch", "websearch", "Expo_write", "context7_query", "future_mcp_write"):
                assert decision(rules, tool, "*") == "deny", (name, tool)
    for profile, name in (("default", "build"), ("smol", "smol"), ("slow", "slow"), ("plan", "plan"), ("advisor", "advisor")):
        codex = tomllib.loads((home / ".codex" / f"{profile}.config.toml").read_text())
        agent = agents[name]
        assert agent["model"] == {"providerID": "openai", "modelID": codex["model"]}
        assert agent["variant"] == codex["model_reasoning_effort"]
        rules = agent["permission"]
        assert decision(rules, "grep", "fixture") == "allow"
        assert decision(rules, "external_directory", "/tmp/disposable") == "allow"
        assert decision(rules, "doom_loop", "*") == "deny"
        assert decision(rules, "bash", "git status --short") == "allow"
        assert decision(rules, "Expo_write", "*") == ("deny" if name in {"plan", "advisor"} else "allow")
        assert decision(rules, "task", "general") == "deny"
        assert decision(rules, "task", "build") == "deny"
        if name in {"plan", "advisor"}:
            assert decision(rules, "edit", "ordinary.txt") == "deny"
            assert decision(rules, "task", "task") == "deny"
            assert decision(rules, "task", "scout") == "allow"
    print("PASS: shared policy, every role body and pin in agents.toml, restricted nested delegation, and five presets")


def verify_secret_rules(sandbox, agents):
    home = sandbox.home
    denied, readable = secret_paths.fixtures(home)
    protected_config = secret_paths.load_protected_config()
    protected = [file.replace("*", "") for file in protected_config["files"]]
    protected += [f"{directory}/nested/fixture" for directory in protected_config["dirs"]]
    name_globs = [glob for glob in secret_paths.load()["fileGlobs"] if not glob.startswith((".", "*"))]
    denied += [f"nested/prefix_{glob.replace('*', 'fixture')}" for glob in name_globs]
    denied += [os.path.relpath(path, sandbox.project) for path in denied if Path(path).is_absolute()]
    for name, agent in agents.items():
        for fixture in denied:
            assert decision(agent["permission"], "read", fixture) == "deny", ("opencode", name, fixture)
        for fixture in readable:
            assert decision(agent["permission"], "read", fixture) == "allow", ("opencode", name, fixture)
        for target in protected:
            assert decision(agent["permission"], "edit", str(home / target)) == "deny", ("opencode", name, target)
        assert decision(agent["permission"], "edit", "../home/.config/opencode/AGENTS.md") == "deny"
    print("PASS: secret file denies, readable env templates, and protected live configuration on every agent")


def verify_file_tools(sandbox):
    home, project = sandbox.home, sandbox.project
    ordinary = project / "ordinary.txt"
    ordinary.write_text("disposable fixture\n")
    allowed = run_tool(sandbox, "scout", "read", {"filePath": str(ordinary)})
    assert allowed.returncode == 0, allowed.stderr
    for secret in (project / ".env", home / ".netrc", home / ".aws/credentials"):
        secret.parent.mkdir(parents=True, exist_ok=True)
        secret.write_text("disposable placeholder\n")
        denied = run_tool(sandbox, "task", "read", {"filePath": str(secret)})
        assert_refused(denied, RULE_DENIED, secret)
        assert "disposable placeholder" not in denied.stdout, secret
    patch = "*** Begin Patch\n*** Update File: ordinary.txt\n@@\n-disposable fixture\n+changed fixture\n*** End Patch"
    readonly = run_tool(sandbox, "reviewer", "apply_patch", {"patchText": patch})
    assert_refused(readonly, TOOL_DISABLED, "reviewer apply_patch")
    assert ordinary.read_text() == "disposable fixture\n", "read-only reviewer changed a project file"
    target = home / ".config/opencode/AGENTS.md"
    original = target.read_text()
    patch = f"*** Begin Patch\n*** Update File: {target}\n@@\n-# OpenCode host map\n+# Changed host map\n*** End Patch"
    protected = run_tool(sandbox, "task", "apply_patch", {"patchText": patch})
    assert_refused(protected, RULE_DENIED, "task apply_patch on live host policy")
    assert target.read_text() == original, "live host policy was writable"
    print("PASS: native reads, secret rejection, read-only reviewer tools, and protected live policy")


def verify_delegation_denials(sandbox):
    for caller, target in (("planner", "task"), ("planner", "coordinator"), ("planner", "planner"),
                           ("coordinator", "coordinator"), ("coordinator", "planner"), ("task", "scout")):
        params = {"description": "Check denied delegation", "prompt": "disposable fixture", "subagent_type": target}
        reason = TOOL_DISABLED if caller == "task" else RULE_DENIED
        assert_refused(run_tool(sandbox, caller, "task", params), reason, (caller, target))
    print("PASS: native recursive orchestrator, planner writer, and leaf delegation rejection")


def verify_config(home):
    config = json.loads((home / ".config/opencode/opencode.json").read_text())
    assert config["autoupdate"] is False and config["share"] == "disabled"
    assert config["subagent_depth"] == 1
    assert config["experimental"]["continue_loop_on_deny"] is False
    assert config["permission"]["*"] == "allow"
    assert '"ask"' not in json.dumps(config["permission"])
    claude_deny = json.loads((home / ".claude/settings.json").read_text())["permissions"]["deny"]
    claude_bash = [rule[len("Bash("):-1] for rule in claude_deny if rule.startswith("Bash(")]
    missing = [glob for glob in claude_bash if config["permission"]["bash"].get(glob) != "deny"]
    assert not missing, ("OpenCode lacks Claude Code bash denies", missing)
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


def verify_resolved_config(home, run):
    config = json.loads((home / ".config/opencode/opencode.json").read_text())
    resolved = json.loads(run(["opencode", "debug", "config"]))
    assert resolved["subagent_depth"] == 2, "task authorization plugin did not enable guarded nesting"
    assert resolved["model"] == config["model"]
    assert resolved["small_model"] == config["small_model"]
    assert resolved["agent"]["general"]["disable"] is True
    assert resolved["agent"]["explore"]["disable"] is True


def main():
    with ci_common.rendered_sandbox("opencode-dotfiles-") as sandbox:
        run = functools.partial(run_command, env=sandbox.env, cwd=sandbox.project)
        version = run(["opencode", "--version"]).strip()
        assert version == ci_common.mise_pin("opencode"), version
        verify_config(sandbox.home)
        servers = json.loads((sandbox.home / ".config/opencode/opencode.json").read_text())["mcp"]
        sandbox.env["OPENCODE_CONFIG_CONTENT"] = json.dumps({"mcp": {name: {"enabled": False} for name in servers}})
        verify_resolved_config(sandbox.home, run)
        agents = {name: json.loads(run(["opencode", "debug", "agent", name]))
                  for name in (*ROLES, "build", "smol", "slow", "plan", "advisor")}
        verify_agents(sandbox.home, agents)
        verify_secret_rules(sandbox, agents)
        skills = json.loads(run(["opencode", "debug", "skill"]))
        assert ci_common.shared_skills() <= {skill["name"] for skill in skills}
        print("PASS: pinned CLI native config/agent loading and shared skill discovery")
        verify_file_tools(sandbox)
        verify_delegation_denials(sandbox)
        verify_task_runtime(run, sandbox.env)
        print("NOT VERIFIED: real model access, MCP authentication, browser operation, and terminal notifications")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(f"FAIL: {error.cmd}: {error.stderr}")
