# Agent configuration

Source paths below are relative to `home/`, the chezmoi source state.

One policy file. Edit `dot_config/ai/AGENTS.md.tmpl` in this repo, then apply. Three hosts read it:

| Host | How the policy arrives | Host config managed here |
|---|---|---|
| Claude Code | `~/.claude/CLAUDE.md` is rendered from it: chezmoi inlines the whole policy at apply time | `settings.json`, `CLAUDE.md`, `statusline.sh` and `statusline.jq`, `agents/`, `skills/` links |
| Codex | `~/.codex/AGENTS.md` is rendered from it with a Codex tool map | `config.toml`, `AGENTS.md`, five named profile files, seven `agents/*.toml` files, `rules/managed.rules` |
| OpenCode | `~/.config/opencode/AGENTS.md` is rendered from it with an OpenCode tool map | `opencode.json`, `tui.json`, `AGENTS.md`, seven `agents/*.md` files |

Also managed: `~/.agents/skills/`, the shared skill store.

**Policy and rules.** `.chezmoidata/approvals.toml` is the one statement of what an agent may
not do unasked. Every host renders its rules from it, and so does the `## Gates` block in
`AGENTS.md`. Each action lands in one of three tiers:

| Tier | Source | Claude Code | Codex | OpenCode |
|---|---|---|---|---|
| Never | host rules | `permissions.deny` | `forbidden` rule | `deny`, derived from Claude's command rules plus secret paths |
| Human gate | `gates` | `permissions.ask`, which prompts in every mode | `prompt` rule, which `auto_review` answers | `ask` patterns, with shell commands approval-gated by default |
| Reviewer | `reviewerRules` | `autoMode.soft_deny` carries the rule text to the classifier | The gate block is the reviewer's `extra_policy` | Shared policy instructions. No automatic reviewer exists |

A gate holds general-purpose tools only. A framework, ORM, or hosting-platform CLI gets no
entry on any host. The reviewer judges it by effect, and CI fails when a rule names one.

Codex has no rule that forces a human answer while `approvals_reviewer` is `auto_review`.
Its reviewer answers a gate prompt and refuses unless the user's own message names the action
and its target. `codexReview` lists the prefixes the Codex sandbox would otherwise run with no
review, such as `rm` and `git reset --hard`.

`optionsFirst` lists the CLIs that take options before the verb, such as `kubectl -n prod delete`.
Claude Code renders a second glob for those, `kubectl * delete*`. Codex prefix rules cannot
express it, so its sandbox and reviewer cover that form.

A gate's `commands` are plain words. Its `globs` are wildcard forms, rendered to Claude Code
and OpenCode. OpenCode reuses Claude's push denies. Codex's prefix rules are separate.

`.github/scripts/check-approvals.py` holds a table of sample commands with the decision each
host must give, and CI runs it against the rendered files. Codex is checked with
`codex execpolicy check`. The Claude Code matcher is emulated in the script.

**MCP servers.** Expo, Notion, and Context7 are declared once, in `.chezmoidata/mcp.toml`. Each host
renders its own form from that list: Codex `config.toml`, OpenCode `opencode.json`, and the
`claude mcp add` bootstrap script. A new server is one entry there, plus the expected sets in
`.github/scripts/check-codex.py` and `.github/scripts/check-opencode.py`.

## OpenCode

`dot_config/opencode/` manages global config under `~/.config/opencode/`.
OpenCode discovers `~/.agents/skills/` directly. No host skill copies are needed.
The host policy takes precedence over its fallback to `~/.claude/CLAUDE.md`.

**Models and roles.** The default uses Codex's model pins. Each of the seven role files
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
`plan` and `advisor` allow only scout and reviewer delegations.
They are read-only session presets rather than Claude's transcript-aware advisor feature.
Role effort is an explicit model `variant`. The session preset does not change role pins.
`small_model` uses the light model for native background tasks such as titles.
Use `/connect` to authenticate the OpenAI provider on the target machine.
Model availability still depends on that account.

**Permissions.** OpenCode uses the last matching rule, unlike Claude's deny-first evaluation.
The catch-all comes first. Shared human gates follow it. Command denies come last.
All shell commands, content searches, unknown tools, and remote MCP tools prompt.
There is no automatic safety reviewer to judge commands the way the other hosts do.
File tools can read and edit ordinary project files without approval.
Environment files, private keys, known credential paths, and live harness config are protected.
The environment-file denies include example, sample, and template files, matching Codex.
`general` and `explore` are disabled. Only the seven role names can be delegated.
All roles are leaves, enforced by both task permissions and `subagent_depth: 1`.
Reviewer permissions deny web access and every unspecified tool, including future MCP tools.

**Enforcement limits.** OpenCode does not provide Codex's filesystem or network sandbox.
Read-only roles cannot call file-edit tools, but an approved shell command can write files.
File-read rules do not protect content searches, shell interpreters, language servers, or MCP.
Inspect their targets before approval. Never use them to read a denied file.
Project config and agent permissions can override the global rules.
In the pinned CLI, an "always" approval is evaluated after the configured rules and can
override a later deny for that session. Use one-time approvals for gated actions.
Never enable `--auto`. It approves `ask` rules without the human gate.
These limits are part of the host policy rather than a claim of sandbox parity.
[Permission reference](https://opencode.ai/docs/permissions/)

**MCP.** Expo and Context7 use `Bearer {env:EXPO_TOKEN}` and
`Bearer {env:CONTEXT7_TOKEN}` respectively. OAuth is disabled for those token-based servers.
Notion uses native OAuth. After applying, run `opencode mcp auth Notion`.
Every remote MCP tool prompts, including reads. OpenCode has no equivalent to Codex's
annotation-based `default_tools_approval_mode = "writes"`.
The pinned headless, isolated Playwright command comes from Claude's tester agent.
It connects globally because OpenCode has no per-agent MCP process configuration.
Only tester and designer have permission to call its tools.
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
The Codex host map translates their tool names.

**Models.** Run `codex --profile <name>` to layer `<name>.config.toml` over the base config.
Profiles set only the session model and effort. Each delegated role keeps its own explicit pin.

| Session or agent | Model | Effort |
|---|---|---|
| Default session, `default` profile, `task`, `designer` | `gpt-6.1-sol` | `high` |
| `slow` profile, `reviewer`, `security-reviewer` | `gpt-6.1-sol` | `xhigh` |
| `smol` profile, `sonic`, `scout`, `tester` | `gpt-6-luna` | `high` |
| Opt-in `plan` and `advisor` profiles | `gpt-6-astra` | `xhigh` |

The profiles are model presets. `--profile plan` does not select the interactive Plan mode.
Model availability depends on the signed-in account. The footer shows model/effort, directory,
branch, and remaining context. Reasoning summaries stay visible. Ghostty receives OSC 9
notifications. [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)

**Permissions.** `project-edit` extends native `:workspace` with network access disabled,
secret-file denies, and read-only protection for live policy/configuration files.
`project-read` inherits those protections and makes workspace files read-only while retaining
system temp writes. Scout, both reviewers, tester, and designer select it. All seven agents
disable further delegation. Reviewer configs disable every managed MCP server and web search.
If a project adds another server, disable it in both reviewer files before using those roles.
Parent runtime permission overrides can supersede an agent's configured defaults.
[Permission profiles](https://learn.chatgpt.com/docs/permissions),
[custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

`approval_policy = "on-request"` routes eligible prompts through `auto_review`. Its additional
policy is the generated gate block alone, including named consent for a gated command.
Automatic review does not inspect actions already allowed inside the sandbox.
Native filesystem denies apply to sandboxed commands. Escalated commands and MCP tools need
the shared policy too. MCP/browser processes do not inherit the command filesystem sandbox.

`rules/managed.rules` forbids directly expressible destructive commands and common
default-branch push forms. It prompts on push, on each shared gate prefix, and on the
`codexReview` prefixes. The Codex-only rules come first, then the shared ones.
There are no broad push or removal allows. Prefix rules govern commands outside the sandbox.
They cannot match arbitrary suffixes, wildcard arguments, every option order, or every remote
and refspec. Absolute executable paths and commands hidden inside scripts also need policy
review. A forbidden decision takes precedence over a prompt, including saved local allow rules.
[Command rules](https://learn.chatgpt.com/docs/agent-configuration/rules)

Within workspace roots, wildcard denies cover environment files (including `.env.example`,
`.env.sample`, and `.env.template`), PEM files, and private-key filenames. Exact home paths
separately deny the configured credential directories and files. Arbitrary secrets outside
workspace roots are not covered by those wildcard rules. The shared policy forbids reading
them everywhere. Use named keys or non-secret config instead. On Linux/Windows, recursive
deny glob expansion is bounded to 20 directory levels. macOS enforces the globs through Seatbelt.

**MCP and authentication.** Expo uses `https://mcp.expo.dev/mcp` and the environment variable
name `EXPO_TOKEN`. Context7 uses `https://mcp.context7.com/mcp` and `CONTEXT7_TOKEN`. Notion
uses `https://mcp.notion.com/mcp`. All three prompt for write tools.
After applying, run `codex login` and `codex mcp login Notion` on the target machine.
Export both tokens from the unmanaged shell config. Tester and designer alone add the pinned
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
`security-reviewer`, `tester`, `designer`) exist under `~/.claude/agents/` unchanged.

**Skills.** Claude Code reads `~/.claude/skills/` only. Each shared skill is a symlink there,
one `dot_claude/skills/symlink_<name>.tmpl` per skill. A new skill under `dot_agents/skills/`
needs its link, and CI fails without it. The directory itself stays real, because Claude Code
writes claude.ai-synced skills into `~/.claude/skills/synced/`.

Only skills that apply to every project are shared here. A skill for one stack, vendor, or
tool lives in the repo of the project that uses it.

**Roles.** Claude Code has no role table, so each role lands on the mechanism that owns it.
Agents name the `opus` and `sonnet` aliases, so a new model release needs no edit here.

| Session or agent | Model and effort |
|---|---|
| Default session | `model: opus`, saved at `high` in `modelSettings` |
| Hard session | `/effort xhigh` for that session |
| Light session | `/model sonnet`, saved at `medium` |
| Advisor | off by default. `claude --advisor fable` turns the advisor on for one session, `/model fable` is saved at `xhigh`. Every subagent inherits the advisor and each call re-reads the whole transcript, so as a default it was two thirds of a plan run's cost |
| `task`, `designer` | opus, high |
| `reviewer`, `security-reviewer` | opus, xhigh, no file edits |
| `tester` | sonnet, high |
| `scout`, `sonic` | sonnet, medium |

**Permissions.** Claude Code evaluates `deny`, then `ask`, then `allow`, whatever the order:

| Setting | Holds |
|---|---|
| `defaultMode: auto` | A classifier reviews what no rule decides. It reads `CLAUDE.md`, so the gate block steers it too |
| `permissions.deny` | the never tier, plus `Read` rules that keep the file tools off `.env*`, keys, `~/.ssh`, `~/.aws`, and `~/.zshrc.local` |
| `permissions.ask` | the gates. It prompts in every mode, auto included, so a gate holds only commands that are rare and hard to undo |
| `autoMode.soft_deny` | the `reviewerRules`, after `$defaults`. The classifier judges every command no rule decides |
| `permissions.allow` | the feature-branch push, plus exact `ask` rules for the bare forms those would also match (`git push origin`) |
| `rm` | no rule beyond the never tier. The built-in critical-path check still prompts on `/`, `~`, and the working directory |
| live config | `Edit(~/.claude/settings*.json)` is denied. Edits to `CLAUDE.md`, `agents/`, `hooks/`, and `AGENTS.md` ask |
| agent choice | `Agent(general-purpose)`, `Agent(claude)`, `Agent(Explore)`, and `Agent(Plan)` are denied. A spawn must name a role agent, and one that omits the type fails. Those four inherit the session model and effort, which is what the role agents exist to avoid |

Two matcher quirks, both checked against the real matcher:

- A trailing ` *` also matches the bare command when it is the rule's only wildcard.
  `sudo *` prompts on a bare `sudo` too, and not on `sudoedit`.
- A pattern ending in `:*` is Claude Code's legacy prefix form, not a wildcard after a colon.
  `git push* :*` is written `git push* :**`, which prints one informational notice at startup.

**MCP.** User-scope servers live in `~/.claude.json`, which is machine state. The bootstrap
script `run_onchange_after_40-claude-mcp.sh.tmpl` registers each shared server with
`claude mcp add --scope user`. To change a server, `claude mcp remove --scope user <name>` and
re-apply.

**Browser.** Claude Code has no built-in browser, so `tester` and `designer` carry their own: an inline
`mcpServers` entry that starts `@playwright/mcp` when the agent starts and stops it when the agent ends.
No other agent and no main session loads it. It runs headless with a throwaway profile on the installed
Google Chrome, and writes screenshots to `/tmp/agent/playwright`. The version is pinned in both agent
files (`0.0.82`). `npx` fetches it on first use, so bump the pin on purpose, in both files.
Codex copies the entry from them, and CI fails when the two differ.

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
`dot_claude/settings.json.tmpl`. It is a template because herdr only recognises its
`SessionStart` hook by the exact absolute command it would write itself.
