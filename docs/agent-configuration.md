# Agent configuration

Source paths below are relative to `home/`, the chezmoi source state.

One policy file. Edit `dot_config/ai/AGENTS.md.tmpl` in this repo, then apply. Three hosts read it:

| Host | How the policy arrives | Host config managed here |
|---|---|---|
| Claude Code | `~/.claude/CLAUDE.md` is rendered from it: chezmoi inlines the whole policy at apply time | `settings.json`, `CLAUDE.md`, `statusline.sh` and `statusline.jq`, `agents/`, `skills/` links |
| Codex | `~/.codex/AGENTS.md` is rendered from it with a Codex tool map | `config.toml`, `AGENTS.md`, five named profile files, nine `agents/*.toml` files, `rules/managed.rules` |
| OpenCode | `~/.config/opencode/AGENTS.md` is rendered from it with an OpenCode tool map | `opencode.json`, `tui.json`, `AGENTS.md`, nine `agents/*.md` files |

Also managed: `~/.agents/skills/`, the shared skill store.

**Policy and rules.** `.chezmoitemplates/autonomy-policy` is included in every host's policy
and in Codex's automatic review policy. Routine project work continues through verification
and a local commit. Agents pause for destructive effects, unresolved decisions, and blockers.
There is no approval-requirements `Gates` section.

`.chezmoidata/forbidden.toml` declares direct database deletion, infrastructure destruction,
persistent-volume removal, and disk erasure commands. Hosts add their existing machine,
credential, and default-branch push denies. Managed command rules contain only blocks.
There are no command ask rules or command allowlists.

Claude's auto mode retains its built-in classifier defaults. Codex retains its built-in reviewer
for eligible approval requests. OpenCode has no automatic safety reviewer.
The deny lists cannot cover effects hidden inside scripts or SQL, every executable path,
or every option order. Agent instructions are not an enforcement boundary.

`.github/scripts/check-approvals.py` checks sample commands against the rendered files.
Codex's `execpolicy check` validates rule matching. It does not execute the commands or prove
full-access execution enforcement. The Claude matcher is emulated in that check.

**MCP servers.** Expo, Notion, and Context7 are declared once, in `.chezmoidata/mcp.toml`. Each host
renders its own form from that list: Codex `config.toml`, OpenCode `opencode.json`, and the
`claude mcp add` bootstrap script. A new server is one entry there, plus the expected sets in
`.github/scripts/check-codex.py` and `.github/scripts/check-opencode.py`.

**Secret paths.** Credential directories, credential files, secret file globs, and readable
env template files are declared once, in `.chezmoidata/sensitive-paths.toml`. Each host
renders its own denies from that list: Claude Code through `.chezmoitemplates/claude-secret-reads`,
OpenCode through `.chezmoitemplates/opencode-secret-paths`, and Codex in `config.toml`.
`.github/scripts/secret_paths.py` builds the fixtures the Codex and OpenCode checks read.
`check-claude.py` compares the rendered Claude rules with the list.
The env template files `.env.example`, `.env.sample`, and `.env.template` are readable on
Claude Code and OpenCode. Codex still denies them. See the Codex section for why.

## OpenCode

`dot_config/opencode/` manages global config under `~/.config/opencode/`.
OpenCode discovers `~/.agents/skills/` directly. No host skill copies are needed.
The host policy takes precedence over its fallback to `~/.claude/CLAUDE.md`.

**Models and roles.** The default uses Codex's model pins. Each of the nine role files
renders its model, effort, description, and instruction body from the Codex template.
Codex itself takes instruction bodies from Claude's agent files.
Changing a role in those sources reaches OpenCode on the next apply.

| Session preset | Select | Model and effort |
|---|---|---|
| Default | `opencode` or `opencode --agent build` | `openai/gpt-6.1-sol`, high |
| Light | `opencode --agent smol` | `openai/gpt-6-luna`, high |
| Extra reasoning | `opencode --agent slow` | `openai/gpt-6.1-sol`, xhigh |
| Read-only planning | `opencode --agent plan` | `openai/gpt-6-astra`, xhigh |
| Read-only advice | `opencode --agent advisor` | `openai/gpt-6-astra`, xhigh |

These are primary agents, selectable with Tab or the agent picker.
`plan` and `advisor` allow only `scout`, `reviewer`, and `security-reviewer` delegations.
They are read-only session presets rather than Claude's transcript-aware advisor feature.
Role effort is an explicit model `variant`. The session preset does not change role pins.
`small_model` uses the light model for native background tasks such as titles.
Use `/connect` to authenticate the OpenAI provider on the target machine.
Model availability still depends on that account.

**Permissions.** OpenCode uses the last matching rule, unlike Claude's deny-first evaluation.
The catch-all allows routine tools. Command denies come last.
Shell commands, content searches, external directories, and remote MCP tools run without
routine prompts. There is no automatic safety reviewer. Destructive-effect pauses depend
on the shared agent policy when no deny rule matches.
Environment files, private keys, known credential paths, and live harness config are protected.
The env template files `.env.example`, `.env.sample`, and `.env.template` stay readable.
`general` and `explore` are disabled. Only the nine role names can be delegated.
All roles are leaves, enforced by both task permissions and `subagent_depth: 1`.
Reviewer permissions deny web access and every unspecified tool, including future MCP tools.

**Enforcement limits.** OpenCode does not provide Codex's filesystem or network sandbox.
Read-only roles cannot call file-edit tools, but an allowed shell command can write files.
File-read rules do not protect content searches, shell interpreters, language servers, or MCP.
Inspect their targets before execution. Never use them to read a denied file.
Project config and agent permissions can override the global rules.
In the pinned CLI, an "always" approval is evaluated after the configured rules and can
override a later deny for that session. Never enable `--auto` to override configured rules.
Repeated identical calls are denied by `doom_loop`.
These limits are part of the host policy rather than a claim of sandbox parity.
[Permission reference](https://opencode.ai/docs/permissions/)

**MCP.** Expo and Context7 use `Bearer {env:EXPO_TOKEN}` and
`Bearer {env:CONTEXT7_TOKEN}` respectively. OAuth is disabled for those token-based servers.
Notion uses native OAuth. After applying, run `opencode mcp auth Notion`.
Remote MCP tools are allowed for writing primary agents and browser roles.
Planning and advisor presets deny Expo and Notion tools.
Reviewer roles deny every MCP tool. OpenCode has no equivalent to Codex's
annotation-based automatic review for side-effecting tools.
The pinned headless, isolated Playwright command comes from Claude's tester agent.
It connects globally because OpenCode has no per-agent MCP process configuration.
Only tester, uxui-designer, and uxui-design-review have permission to call its tools.
Its screenshots use `/tmp/agent/playwright`.

**Terminal and machine state.** `tui.json` enables terminal-mediated desktop notifications
with sound disabled. The native status display replaces the custom status lines.
Use `/thinking` to show reasoning summaries. That display preference is interactive state.
Automatic updates and session sharing are disabled.
Authentication, history, databases, caches, generated dependencies, and interactive state
are unmanaged. No OpenCode herdr integration is configured here.
Inspect `chezmoi diff ~/.config/opencode` before applying over local configuration.
Quit and restart OpenCode after applying because running sessions keep their loaded config.

**Validation.** `python3 .github/scripts/check-opencode.py` renders into a disposable home
and loads config, roles, presets, and skills with the mise-pinned CLI.
It checks effective permission ordering and executes native file-tool deny checks with
disposable placeholders. MCP servers are disabled only in that isolated test process.
It makes no model requests or authenticated service calls.
Browser operation, model access, and terminal notifications need a target-machine check.

## Codex

`private_dot_codex` manages user-level configuration in the default `~/.codex` directory.
Codex discovers `~/.agents/skills` directly. No Codex skill copies or links are needed.
Agent instructions are rendered from `dot_claude/agents/*.md`, with YAML frontmatter removed.
The Codex host map translates their tool names. Removing the frontmatter drops Claude's
`skills:` preload, so the Codex and OpenCode host maps tell writers and reviewers to load
`clean-code` and `application-security` themselves.

**Models.** Run `codex --profile <name>` to layer `<name>.config.toml` over the base config.
Profiles set only the session model and effort. Each delegated role keeps its own explicit pin.

| Session or agent | Model | Effort |
|---|---|---|
| Default session, `default` profile, `task`, `reviewer`, `uxui-designer`, `uxui-design-review` | `gpt-6.1-sol` | `high` |
| `slow` profile, `ship-reviewer`, `security-reviewer` | `gpt-6.1-sol` | `xhigh` |
| `smol` profile, `sonic`, `scout`, `tester` | `gpt-6-luna` | `high` |
| Opt-in `plan` and `advisor` profiles | `gpt-6-astra` | `xhigh` |

The profiles are model presets. `--profile plan` does not select the interactive Plan mode.
Model availability depends on the signed-in account. The footer shows model/effort, directory,
branch, and remaining context. Reasoning summaries stay visible. Ghostty receives OSC 9
notifications. [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)

**Permissions.** The default session, `task`, `sonic`, and `uxui-designer` select `:danger-full-access`.
They run without a filesystem or network sandbox. This also removes native credential-file
and live-policy-file protection from those commands. The shared policy still forbids access.
Other roles retain sandboxed permission profiles.

The optional `project-edit` profile extends native `:workspace` with network access enabled,
secret-file denies, and read-only protection for live policy/configuration files.
`project-read` inherits those protections and makes workspace files read-only while retaining
system temp writes and disabling command network access. Scout, the three reviewers, tester,
and uxui-design-review select it. All nine agents
disable further delegation. Reviewer configs disable every managed MCP server and web search.
If a project adds another server, disable it in all three reviewer files before using those roles.
Parent runtime permission overrides can supersede an agent's configured defaults.
[Permission profiles](https://learn.chatgpt.com/docs/permissions),
[custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

`approval_policy = "on-request"` routes eligible prompts through `auto_review`. Its additional
policy is the shared autonomy policy. The built-in reviewer policy remains active.
Automatic review does not inspect ordinary commands in full access because they do not
request sandbox approval. It still handles eligible MCP, app, and explicit approval requests.
Native filesystem denies apply to sandboxed commands. Escalated commands and MCP tools need
the shared policy too. MCP/browser processes do not inherit the command filesystem sandbox.

`rules/managed.rules` forbids directly expressible destructive commands and common
default-branch push forms. It contains only `forbidden` entries.
There are no push or removal allowlists. Prefix rules govern commands outside the sandbox.
They cannot match arbitrary suffixes, wildcard arguments, every option order, or every remote
and refspec. Absolute executable paths and commands hidden inside scripts also need policy
review. Rule matching is validated, but full-access command execution is not tested by the
configuration checks. A forbidden match takes precedence over saved local allow rules.
[Command rules](https://learn.chatgpt.com/docs/agent-configuration/rules)

In the optional sandbox profiles, wildcard denies cover environment files, PEM files,
private-key filenames, and every directory named like a home credential directory
(`**/.ssh/**`, `**/.aws/**`, and the rest). The env template files `.env.example`,
`.env.sample`, and `.env.template` stay denied under `**/.env.*`. Codex 0.159.3 rejects a
`read` rule on a glob path, so no exception can carve them out. Exact home paths
separately deny the configured credential directories and files. Arbitrary secrets outside
workspace roots are not covered by those wildcard rules. The shared policy forbids reading
them everywhere. Use named keys or non-secret config instead. On Linux/Windows, recursive
deny glob expansion is bounded to 20 directory levels. macOS enforces the globs through Seatbelt.

**MCP and authentication.** Expo uses `https://mcp.expo.dev/mcp` and the environment variable
name `EXPO_TOKEN`. Context7 uses `https://mcp.context7.com/mcp` and `CONTEXT7_TOKEN`. Notion
uses `https://mcp.notion.com/mcp`. Write-tool approval requests route through automatic review.
After applying, run `codex login` and `codex mcp login Notion` on the target machine.
Export both tokens from the unmanaged shell config. Tester, uxui-designer, and uxui-design-review alone add the pinned
Playwright MCP. Its entry is copied from the Claude agent files, with headless isolated
browsing and output under `/tmp/agent/playwright`.
No authentication or service writes occur during repository validation.

**Machine state.** Authentication, sessions, histories, databases, caches, generated
`hooks.json`/hooks, and interactive `rules/default.rules` are unmanaged. Herdr installs Codex
hooks after mise. Local project trust and saved interactive preferences live in `config.toml`,
which is managed. `chezmoi apply` restores that entire file and can remove those local entries.
Inspect `chezmoi diff ~/.codex/config.toml` before applying if you want to retain them.
Use the dotfiles source for permanent settings. Additional machine-local Codex files are ignored
by default, with exceptions only for the declared configuration files, agents, and managed rules.

## Claude Code

`~/.claude/CLAUDE.md` holds no policy of its own. Its source, `dot_claude/CLAUDE.md.tmpl`, includes
`dot_config/ai/AGENTS.md.tmpl` in full, so Claude Code reads the same rules as Codex, and a rule
edit reaches both hosts on the next `chezmoi apply`. After the rules it carries a host map that
translates the terms the policy and the skills use into Claude Code tools. One skill text runs
on both hosts, and the agent names the skills dispatch (`task`, `sonic`, `scout`, `reviewer`,
`security-reviewer`, `ship-reviewer`, `tester`, `uxui-designer`, `uxui-design-review`) exist under `~/.claude/agents/` unchanged.

**Skills.** Claude Code reads `~/.claude/skills/` only. Each shared skill is a symlink there,
one `dot_claude/skills/symlink_<name>.tmpl` per skill. A new skill under `dot_agents/skills/`
needs its link, and CI fails without it. The directory itself stays real, because Claude Code
writes claude.ai-synced skills into `~/.claude/skills/synced/`.

Only skills that apply to every project are shared here. A skill for one stack, vendor, or
tool lives in the repo of the project that uses it.

**Roles.** Claude Code has no role table, so each role lands on the mechanism that owns it.
Agents name the `opus` and `sonnet` aliases, so a new model release needs no edit here.
`modelSettings` keys saved effort by the same aliases. Fable keeps its exact ID, `claude-fable-5-1`.
CI fails on an exact-ID key for opus, sonnet, or haiku.

| Session or agent | Model and effort |
|---|---|
| Default session | `model: opus`, saved at `high` in `modelSettings` |
| Hard session | `/effort xhigh` for that session |
| Light session | `/model sonnet`, saved at `medium` |
| Advisor | off by default. `claude --advisor fable` turns the advisor on for one session, `/model fable` is saved at `xhigh`. Every subagent inherits the advisor and each call re-reads the whole transcript, so as a default it was two thirds of a plan run's cost |
| `task`, `uxui-designer`, `uxui-design-review` | opus, high |
| `reviewer` | opus, high, no file edits |
| `ship-reviewer`, `security-reviewer` | opus, xhigh, no file edits |
| `tester` | sonnet, high |
| `scout`, `sonic` | sonnet, medium |

The writers (`task`, `sonic`, `uxui-designer`) and the three reviewers preload `clean-code`
and `application-security` through `skills:` in their frontmatter. `scout`, `tester`, and
`uxui-design-review` preload neither, and CI fails if one of them preloads `application-security`.

**Permissions.** Claude Code evaluates `deny`, then `ask`, then `allow`, whatever the order:

| Setting | Holds |
|---|---|
| `defaultMode: auto` | The classifier reviews eligible actions. The shared autonomy policy is included in `CLAUDE.md` |
| `permissions.deny` | Destructive command blocks, default-branch push blocks, credential read denies, and protected live config |
| `permissions.ask` and `permissions.allow` | Absent from managed settings. Project or managed settings can still add rules |
| `autoMode.soft_deny` | Only `$defaults`. The built-in classifier policy remains active |
| `sandbox.enabled` | `false`. Auto mode remains enabled without the Bash sandbox |
| `rm` | The built-in critical-path check can still prompt on `/`, `~`, and the working directory |
| live config | File edits to settings, `CLAUDE.md`, agents, hooks, and shared `AGENTS.md` are denied |
| agent choice | `Agent(general-purpose)`, `Agent(claude)`, `Agent(Explore)`, and `Agent(Plan)` are denied. A spawn must name a role agent, and one that omits the type fails. Those four inherit the session model and effort, which is what the role agents exist to avoid |

The credential read denies follow `.chezmoidata/sensitive-paths.toml`. A `!` exception
cannot carve a file out of an absolute `//**` rule, so `.env.*` has only the project-relative
`Read(.env.*)`, which matches at any depth inside the session directory. The env template
files are readable there. A `.env.local` outside the session directory has no read deny.
The shared policy still forbids reading it.

A trailing ` *` matches the bare command when it is the rule's only wildcard.
The sample-command check emulates this Claude matcher behavior.
Runtime classifier decisions and account availability are not exercised by repository checks.
[Claude permission modes](https://code.claude.com/docs/en/permission-modes)

**MCP.** User-scope servers live in `~/.claude.json`, which is machine state. The bootstrap
script `run_onchange_after_40-claude-mcp.sh.tmpl` compares each shared server with its
user-scope entry there, by url and Authorization header. It registers a missing server with
`claude mcp add --scope user`, re-registers a changed one, and skips an unchanged one, so a
Notion OAuth login survives a re-run. Without `jq` or `~/.claude.json`, it only adds a server
that `claude mcp get` cannot find. A server deleted from `.chezmoidata/mcp.toml` stays
registered. Remove it by hand with `claude mcp remove --scope user <name>`.
`tests/test_claude_mcp_script.py` runs the script against a fake `claude`.

**Browser.** Claude Code has no built-in browser, so `tester`, `uxui-designer`, and `uxui-design-review` carry their own: an inline
`mcpServers` entry that starts `@playwright/mcp` when the agent starts and stops it when the agent ends.
No other agent and no main session loads it. It runs headless with a throwaway profile on the installed
Google Chrome, and writes screenshots to `/tmp/agent/playwright`. The version is pinned in all three agent
files (`0.0.82`). `npx` fetches it on first use, so bump the pin on purpose, in all three files.
Codex copies the entry from them, and CI fails when they differ.

**Status line.** `~/.claude/statusline.sh` reads `git status` and hands the session JSON to
`statusline.jq`, which draws one row: session time, model and effort, path, branch with
`+staged *unstaged ?untracked`, cost, a context gauge that fills the gap, the context window
size, and the session name. Colours are the terminal's 16-colour
palette slots, never RGB, so the row follows the Ghostty theme. Remap them in the
constants at the top of `statusline.jq`. The icons need a Nerd Font. A narrow terminal first
truncates the session name, then shortens the path to the directory name.

**Editor.** In nvim, `codecompanion.nvim` chats through its stock `claude_code` adapter, which
spawns `claude-agent-acp`. mise pins that bridge next to `claude`. Pick the bridge release
whose `@anthropic-ai/claude-agent-sdk` dependency matches the `claude` pin. The bridge runs
Claude Code with the same settings and permissions as the CLI, so a gated tool call arrives as
an ACP permission prompt in the chat buffer. `<leader>aa` toggles the chat, and the
same key on a visual selection sends that code block with its path and line range.

**Drift.** Claude Code rewrites `~/.claude/settings.json` when `/model`, `/effort`, `/advisor`,
or a "don't ask again" answer saves a value. `chezmoi diff ~/.claude/settings.json` shows it.
The source is a template, so `chezmoi re-add` skips it: merge by hand into
`dot_claude/settings.json.tmpl`. Move an opus or sonnet effort saved under an exact model ID
to its alias key, or CI fails. It is a template because herdr only recognises its
`SessionStart` hook by the exact absolute command it would write itself.
