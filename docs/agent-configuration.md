# Agent configuration

One policy file. Edit `dot_config/ai/AGENTS.md` in this repo, then apply. Three hosts read it:

| Host | How the policy arrives | Host config managed here |
|---|---|---|
| omp | `~/.omp/agent/AGENTS.md` is a symlink to it | `config.yml`, `mcp.json`, `agents/` |
| Claude Code | `~/.claude/CLAUDE.md` is rendered from it: chezmoi inlines the whole policy at apply time | `settings.json`, `CLAUDE.md`, `statusline.sh` and `statusline.jq`, `agents/`, `skills/` links |
| Codex | `~/.codex/AGENTS.md` is rendered from it with a Codex tool map | `config.toml`, `AGENTS.md`, five named profile files, seven `agents/*.toml` files, `rules/managed.rules` |

Also managed: `~/.agents/skills/`, the shared skill store.

**MCP servers.** Expo and Notion are declared once, in `.chezmoidata/mcp.toml`. Each host
renders its own form from that list: omp `mcp.json`, Codex `config.toml`, and the
`claude mcp add` bootstrap script. A new server is one entry there, plus the expected set in
`.github/scripts/check-codex.py`.

## omp

`config.yml` holds the model roles and the `bash.patterns` approvals. The `tester` and
`designer` agents in `private_dot_omp/private_agent/agents/` are hand-ported from
`dot_claude/agents/`. Only the tool names differ, so an edit to one goes into the other.

In nvim, `codecompanion.nvim` is the editor-side client: its `omp` adapter spawns `omp acp`
and reuses the same credentials, skills, and `bash.patterns` approvals as the CLI. Tool calls
that OMP gates arrive as ACP permission prompts in the chat buffer. `<leader>aa` toggles the
chat, the same key on a visual selection sends that code block with its path and line range.

## Codex

`private_dot_codex` manages user-level configuration in the default `~/.codex` directory.
Codex discovers `~/.agents/skills` directly. No Codex skill copies or links are needed.
Agent instructions are rendered from `dot_claude/agents/*.md`, with YAML frontmatter removed.
The Codex host map translates their tool names. Claude and OMP keep their existing settings.

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
disable further delegation. Reviewer configs disable the two managed MCP servers and web search.
If a project adds another server, disable it in both reviewer files before using those roles.
Parent runtime permission overrides can supersede an agent's configured defaults.
[Permission profiles](https://learn.chatgpt.com/docs/permissions),
[custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

`approval_policy = "on-request"` routes eligible prompts through `auto_review`. Its additional
policy comes from the same shared `AGENTS.md`, including explicit consent for destructive work.
Automatic review does not inspect actions already allowed inside the sandbox.
Native filesystem denies apply to sandboxed commands. Escalated commands and MCP tools need
the shared policy too. MCP/browser processes do not inherit the command filesystem sandbox.

`rules/managed.rules` prompts on push, removal, history rewriting, deployment, publishing,
dependency changes, cloud/database commands, and other sensitive command families.
It forbids directly expressible destructive commands and common default-branch push forms.
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
name `EXPO_TOKEN`. Notion uses `https://mcp.notion.com/mcp`. Both prompt for write tools.
After applying, run `codex login` and `codex mcp login Notion` on the target machine.
Export `EXPO_TOKEN` from the unmanaged shell config. Tester and designer alone add the pinned
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
`dot_config/ai/AGENTS.md` in full, so Claude Code reads the same rules as omp, and a rule edit
reaches both hosts on the next `chezmoi apply`. After the rules it carries a host map that
translates the omp tool names the policy and the skills use (`skill://`, `task`, `hub send`,
`eval`) into Claude Code tools. One skill text runs on both hosts, and the agent names the
skills dispatch (`task`, `sonic`, `scout`, `reviewer`, `security-reviewer`, `tester`,
`designer`) exist under `~/.claude/agents/` unchanged.

**Skills.** Claude Code reads `~/.claude/skills/` only. Each shared skill is a symlink there,
one `dot_claude/skills/symlink_<name>.tmpl` per skill. A new skill under `dot_agents/skills/`
needs its link, and CI fails without it. The directory itself stays real, because Claude Code
writes claude.ai-synced skills into `~/.claude/skills/synced/`.

Only skills that apply to every project are shared here. A skill for one stack, vendor, or
tool lives in the repo of the project that uses it.

**Roles.** omp maps roles to models in `modelRoles`. Claude Code has no role table, so each
role lands on the mechanism that owns it. Agents name the `opus` and `sonnet` aliases, so a
new model release needs no edit here.

| omp role | Claude Code |
|---|---|
| `default` | `model: opus`, saved at `high` in `modelSettings` |
| `slow` | `/effort xhigh` for the session. The two reviewer agents always run at `xhigh` |
| `smol` | `/model sonnet`, saved at `medium` |
| `plan`, `advisor` | off by default. `claude --advisor fable` turns the advisor on for one session, `/model fable` is saved at `xhigh`. Every subagent inherits the advisor and each call re-reads the whole transcript, so as a default it was two thirds of a plan run's cost |
| `task` | agent `task`: opus, high |
| `REVIEWER` | agents `reviewer` and `security-reviewer`: opus, xhigh, no file edits |
| `DESIGNER` | agent `designer`: opus, high |
| `TESTER` | agent `tester`: sonnet, high |
| bundled `scout`, `sonic` | agents `scout` and `sonic`: sonnet, medium |
| `commit`, `tiny`, `vision`, `memory`, `web` | no equivalent. The session model and the built-in web tools cover them |

**Permissions.** `bash.patterns` is an ordered list on a default-allow host. Claude Code
evaluates `deny`, then `ask`, then `allow`, whatever the order, so the port is not line for
line:

| omp | Claude Code |
|---|---|
| default allow | `defaultMode: auto`. A classifier reviews what no rule decides. It reads `CLAUDE.md`, so the policy steers it too |
| `deny` | `permissions.deny`, plus `Read` rules that keep the file tools off `.env*`, keys, `~/.ssh`, `~/.aws`, and `~/.zshrc.local` |
| `prompt` | `permissions.ask`. It prompts in every mode, auto included |
| `allow`: feature-branch push, scratch `rm` | `permissions.allow`, plus exact `ask` rules for the bare forms those would also match (`git push origin`) |
| `rm *` → prompt | no rule. An `ask` on `rm *` would override the scratch `allow`. Manual mode prompts anyway, auto mode sends it to the classifier |
| `*.omp/agent/config.yml*` → deny | `Edit(~/.claude/settings*.json)` is denied. Edits to `CLAUDE.md`, `agents/`, `hooks/`, and `AGENTS.md` ask |
| agents are picked by name | `Agent(general-purpose)`, `Agent(claude)`, `Agent(Explore)`, and `Agent(Plan)` are denied. A spawn must name a role agent, and one that omits the type fails. Those four inherit the session model and effort, which is what the role agents exist to avoid |

Two pattern differences, both checked against the real matcher:

- A trailing ` *` also matches the bare command. `npm install *` prompts on a bare
  `npm install` too. `npm ci` is the unprompted lockfile install.
- A pattern ending in `:*` is Claude Code's legacy prefix form, not a wildcard after a colon.
  `git push* :*` is written `git push* :**` and `rails db:*` is written `rails db*`. The first
  prints one informational notice at startup.

**MCP.** User-scope servers live in `~/.claude.json`, which is machine state. The bootstrap
script `run_onchange_after_40-claude-mcp.sh.tmpl` registers Expo and Notion with
`claude mcp add --scope user`. To change a server, `claude mcp remove --scope user <name>` and
re-apply.

**Browser.** Claude Code has no built-in browser, so `tester` and `designer` carry their own: an inline
`mcpServers` entry that starts `@playwright/mcp` when the agent starts and stops it when the agent ends.
No other agent and no main session loads it. It runs headless with a throwaway profile on the installed
Google Chrome, and writes screenshots to `/tmp/agent/playwright`. The version is pinned in both agent
files (`0.0.82`). `npx` fetches it on first use, so bump the pin on purpose, in both files.
Codex copies the entry from them, and CI fails when the two differ.

**Status line.** `~/.claude/statusline.sh` reads `git status` and hands the session JSON to
`statusline.jq`, which draws one row modelled on the omp footer: session time, model and
effort, path, branch with `+staged *unstaged ?untracked`, cost, a context gauge that fills the
gap, the context window size, and the session name. Colours are the terminal's 16-colour
palette slots, never RGB, so the row follows the Ghostty theme. Remap them in the
constants at the top of `statusline.jq`. The icons need a Nerd Font. A narrow terminal first
truncates the session name, then shortens the path to the directory name. omp's running
subagent count has no equivalent, because Claude Code does not pass it to the script.

**Drift.** Claude Code rewrites `~/.claude/settings.json` when `/model`, `/effort`, `/advisor`,
or a "don't ask again" answer saves a value. `chezmoi diff ~/.claude/settings.json` shows it.
The source is a template, so `chezmoi re-add` skips it: merge by hand into
`dot_claude/settings.json.tmpl`. It is a template because herdr only recognises its
`SessionStart` hook by the exact absolute command it would write itself.
