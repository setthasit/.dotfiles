# Agent configuration

One policy file reaches three agent hosts: Claude Code (the default), Codex, and OpenCode.
`chezmoi apply` renders every host file from the sources below. Paths are relative to the repo root. A path that starts with `~` is a rendered file.

## How it fits

- **Policy.** `home/dot_config/ai/AGENTS.md.tmpl` renders to `~/.config/ai/AGENTS.md`. Each host file includes the whole policy, then adds a host map that translates the policy's terms into that host's tools:
  - Claude Code: `home/dot_claude/CLAUDE.md.tmpl` renders `~/.claude/CLAUDE.md`
  - Codex: `home/private_dot_codex/AGENTS.md.tmpl` renders `~/.codex/AGENTS.md`
  - OpenCode: `home/dot_config/opencode/AGENTS.md.tmpl` renders `~/.config/opencode/AGENTS.md`
- **Autonomy rules.** `home/.chezmoitemplates/autonomy-policy` is included in the policy and in Codex's automatic review policy, `[auto_review]` in `~/.codex/config.toml`.
- **Roles.** Each role's description, skill list, and instructions live once, in `home/dot_claude/agents/<role>.md.tmpl`. The Codex and OpenCode role files render from it through `home/.chezmoitemplates/agent-definition`, which turns the `skills:` list into a first line "Load the ... skills before you start." `task` and `task-light` share the body `agent-task-body.md`. `reviewer` and `ship-reviewer` share `agent-reviewer-body.md`.
- **Skills.** `home/dot_agents/skills/` renders to `~/.agents/skills/`. Codex and OpenCode read that directory. Claude Code reads only `~/.claude/skills/`, so each skill gets a symlink there. The directory itself stays real because Claude Code writes claude.ai-synced skills into `~/.claude/skills/synced/`.

| `home/.chezmoidata/` file | Feeds |
|---|---|
| `agents.toml` | Codex and OpenCode role files: model, effort, permission profile, and the `reviewer`, `browser`, `delegates`, and `todowrite` flags. Its `[playwright]` table is the browser MCP (Model Context Protocol) command on all three hosts |
| `mcp.toml` | The MCP servers on every host: Claude Code's script `home/run_onchange_after_40-claude-mcp.sh.tmpl`, `~/.codex/config.toml`, `~/.config/opencode/opencode.json` |
| `forbidden.toml` | Destructive commands every host denies: Claude Code and OpenCode bash denies, Codex `~/.codex/rules/managed.rules` |
| `sensitive-paths.toml` | Secret paths: Claude Code read denies, OpenCode read, edit, and external-directory denies, Codex sandbox denies. Its `readable` list keeps `.env.example`, `.env.sample`, and `.env.template` readable on Claude Code and OpenCode |
| `protected-config.toml` | Live agent config that Claude Code and OpenCode refuse to edit, so an agent changes the source instead |

## Common changes

Run `chezmoi apply` after each change, then restart the host. A running session keeps the config it loaded.

**Edit a policy rule**

1. Edit `home/dot_config/ai/AGENTS.md.tmpl`. A rule for one host only goes in that host's map.
2. Keep the rendered policy under `POLICY_BYTE_CEILING` in `.github/scripts/check-claude.py`. Measure it with `chezmoi execute-template < home/dot_config/ai/AGENTS.md.tmpl | wc -c`.
3. Run `./.github/scripts/check-em-dash.sh`.

**Add a skill**

1. Create `home/dot_agents/skills/<name>/SKILL.md`. Load the `writing-for-agents` skill first. A script needs the `executable_` name prefix.
2. Add `home/dot_claude/skills/symlink_<name>.tmpl` with the single line `{{ .chezmoi.homeDir }}/.agents/skills/<name>`.
3. Add a row to the "Skills in this environment" table in the policy.

Only a skill that applies to every project belongs here. A skill for one stack lives in that project's repo. To remove a skill, delete its directory and its symlink file, then add `.agents/skills/<name>` and `.claude/skills/<name>` to `home/.chezmoiremove`.

**Add a role**

1. `home/dot_claude/agents/<role>.md.tmpl`: frontmatter `name`, `description`, `model`, `effort`, `skills`, and `tools` or `disallowedTools`. A role that waits on long runs adds `experimental.cacheTtl: 1h`. A browser role includes `agent-playwright.yaml` in its frontmatter, as `tester.md.tmpl` does.
2. `home/.chezmoidata/agents.toml`: a `[roles.<role>]` table. Add the role to the coordinator's `delegates` if plans should dispatch it.
3. `home/private_dot_codex/agents/<role>.toml.tmpl` and `home/dot_config/opencode/agents/<role>.md.tmpl`: one line each. Copy a sibling and change the name.
4. `home/dot_config/ai/AGENTS.md.tmpl`: a row in "Subagent roles".
5. `.github/scripts/agent_roles.py`: the `PINNED_*` sets the role belongs to.
6. `.github/scripts/check-claude.py`: `SECURITY_SKILL_AGENTS` for a writer or judge, `SUMMARY_ONLY_AGENTS` for a role that only reports.
7. `home/dot_agents/skills/implement-plan-execution/SKILL.md`: the "Role → agent" table, if plans should use the role.
8. The host maps, where they name a set of roles: the browser row in `home/dot_claude/CLAUDE.md.tmpl`, and "ten leaf roles" in `home/dot_config/opencode/AGENTS.md.tmpl`.
9. The roles table below.

**Add an MCP server**

1. Add an entry to `home/.chezmoidata/mcp.toml` with `name`, `url`, and `tokenEnv` when the server takes a bearer token.
2. Export the token in `~/.zshrc.local` and list it in `home/dot_zshrc.local.example`.
3. Apply, then log in to an OAuth server on each host (see [MCP and auth](#mcp-and-auth)).
4. Update the expected server list the CI steps "Validate Codex configuration and permissions" and "Validate OpenCode configuration and permissions" compare against.

The three reviewer roles get no MCP access on any host. On Codex, `reviewer = true` disables each `mcp.toml` server by name in their role files, so a new shared server needs no extra step. Claude Code and OpenCode reviewers deny every MCP tool. A server that a project adds in its own Codex config is not disabled for the Codex reviewers. Nothing in this repo handles that case.

**Change a model or effort**

- Claude Code role: `model` and `effort` in its agent file. Use the aliases `opus`, `sonnet`, and `haiku`, so a new release needs no edit. Fable has no alias and keeps its exact ID, `claude-fable-5-1`.
- Claude Code session: `model` and `modelSettings` in `home/dot_claude/settings.json.tmpl`. Key an effort by alias. CI fails on an exact ID for opus, sonnet, or haiku.
- Codex or OpenCode role: `model` and `effort` in `agents.toml`. OpenCode renders them as `openai/<model>` and `variant`.
- Codex profile or OpenCode preset: `home/private_dot_codex/<name>.config.toml`. OpenCode builds its five presets and its `small_model` from these files.
- Add a line to [Decisions](#decisions) with the reason.

**Bump the Playwright pin**

Edit the version in `args` under `[playwright]` in `agents.toml`. All three hosts render from it. `npx` fetches the new version on first use.

**Adopt settings drift**

- Claude Code rewrites `~/.claude/settings.json` when `/model`, `/effort`, `/advisor`, or a "don't ask again" answer saves a value. The source is a template because it holds home paths, so `chezmoi re-add` skips it. Read `chezmoi diff ~/.claude/settings.json` and merge by hand into `home/dot_claude/settings.json.tmpl`. Move an effort saved under an exact model ID to its alias key.
- Codex saves project trust and preferences in `~/.codex/config.toml`, which is managed. `chezmoi apply` overwrites them. Read `chezmoi diff ~/.codex/config.toml` first and move what you want to keep into the source.
- OpenCode: read `chezmoi diff ~/.config/opencode` before you apply.

## Roles and models

| Role | Claude Code | Codex and OpenCode | Codex permissions | Notes |
|---|---|---|---|---|
| `task` | opus, high | gpt-6.1-sol, high | full access | 1h cache |
| `task-light` | sonnet, high | gpt-6-luna, high | full access | 1h cache |
| `sonic` | haiku, medium | gpt-6-luna, high | full access | |
| `uxui-designer` | opus, high | gpt-6.1-sol, high | full access | browser |
| `scout` | sonnet, medium | gpt-6-luna, high | `project-read` | |
| `reviewer` | opus, high | gpt-6.1-sol, high | `project-read` | no MCP, no web |
| `ship-reviewer` | opus, xhigh | gpt-6.1-sol, xhigh | `project-read` | no MCP, no web, 1h cache |
| `security-reviewer` | opus, xhigh | gpt-6.1-sol, xhigh | `project-read` | no MCP, no web, 1h cache |
| `tester` | sonnet, high | gpt-6-luna, high | `project-read` | browser |
| `uxui-design-review` | opus, high | gpt-6.1-sol, high | `project-read` | browser, 1h cache |
| `planner` | opus, xhigh | gpt-6-astra, xhigh | `project-edit` | spawns `scout` |
| `coordinator` | opus, high | gpt-6-astra, high | `project-edit` | spawns the ten roles above it |

"Full access" is Codex's `:danger-full-access`. "1h cache" is `experimental.cacheTtl: 1h` on Claude Code.
Writers and the three reviewers preload the `clean-code` and `application-security` skills. `planner` preloads `implementation-plan-creator`. `coordinator` preloads `implement-plan-execution`. It reads the `clean-code` skill's `references/review-scoring.md` as the rubric and turns the judges' findings into a decision with `implement-plan-execution/references/scoring.md`.

| Session | Claude Code | Codex (`codex --profile <name>`) and OpenCode (`opencode --agent <name>`) |
|---|---|---|
| Default | opus, high | `default` (OpenCode `build`): gpt-6.1-sol, high |
| Light | `/model sonnet`, saved at medium | `smol`: gpt-6-luna, high |
| Hard | `/effort xhigh` for the session | `slow`: gpt-6.1-sol, xhigh |
| Advisor or planning | Off by default. `claude --advisor fable` turns it on for one session. `/model fable` is saved at xhigh | `plan` and `advisor`: gpt-6-astra, xhigh |

A Codex profile sets only the session model and effort. Each role keeps its own pin. `--profile plan` does not select Codex's interactive Plan mode. OpenCode's `plan` and `advisor` presets cannot edit files, can spawn only `scout`, `reviewer`, and `security-reviewer`, and deny the Expo and Notion tools.

## Permissions and enforcement limits

No host has managed ask rules or command allowlists. Each host denies the `forbidden.toml` commands plus a fixed list of machine, credential, and default-branch push commands. Claude Code and OpenCode take that list from `home/.chezmoitemplates/bash-deny-globs`. Codex has its own in `home/private_dot_codex/rules/managed.rules.tmpl`. A deny list cannot cover effects hidden in a script or SQL, every executable path, or every option order. Agent instructions are not an enforcement boundary.

**Shell reads are not sandboxed.** Claude Code runs with `sandbox.enabled: false`. Its read denies stop the file tools, not Bash, so `cat ~/.zshrc.local` is not blocked. The Codex session and its writer roles run with full access, which has no secret denies. This is a deliberate trade for fewer prompts. On Codex, `planner`, `coordinator`, and the read-only roles stay sandboxed. Claude Code roles share the session's setting.

**Protected live config.** `protected-config.toml` lists the agent config that chezmoi renders. Claude Code and OpenCode deny file edits there. A shell write is not blocked. On Codex, the sandboxed roles see the Codex config files and the policy as read-only, and full-access commands see no protection.

**Claude Code**

- `defaultMode: auto`: the classifier reviews eligible actions. `autoMode.soft_deny` is only `$defaults`.
- Claude Code applies deny, then ask, then allow, whatever the order in the file.
- Denied subagent types: `general-purpose`, `claude`, `Explore`, and `Plan`. They inherit the session model and effort, which the roles exist to avoid.
- A `!` exception cannot carve a file out of an absolute `//**` rule. So `.env.*` is denied only by the project-relative `Read(.env.*)`, and a `.env.local` outside the session directory has no read deny.
- In a Bash rule, a trailing ` *` also matches the bare command when it is the rule's only wildcard.

**Codex**

- `project-edit` extends `:workspace` with network access, secret denies, and read-only Codex config and policy files. `project-read` extends it, makes the workspace read-only, and turns off command network access.
- `approval_policy = "on-request"` sends eligible requests to automatic review. A full-access command requests no approval, so automatic review never sees it. MCP and explicit approval requests still go through it.
- `rules/managed.rules` holds only `forbidden` entries. A forbidden match wins over a saved local allow rule.
- Rules match literal command prefixes. They cannot enforce a suffix, a refspec like `feature:main`, `git -C dir push`, or an effect hidden in a script. Credential protection for unsandboxed commands depends on the shared policy.
- The sandbox denies `**/.env.*`, and the pinned CLI rejects a `read` rule on a glob path. So `.env.example` and the other env templates stay unreadable on Codex.
- MCP and browser processes do not inherit the command sandbox.

**OpenCode**

- The last matching rule wins. A catch-all allow comes first and the denies come last.
- OpenCode has no automatic safety reviewer and no filesystem or network sandbox.
- The read-only roles (`scout`, the three reviewers, `tester`, `uxui-design-review`) have no file-edit tools but allow every shell command outside the deny list. Only Codex's sandbox enforces read-only for shell commands.
- File-read denies do not cover content search, the shell, language servers, or MCP tools.
- Project config and agent permissions can override the global rules.
- In the pinned CLI, an "always" approval is checked after the configured rules and can override a later deny for that session. Never start OpenCode with `--auto`.
- `doom_loop` denies repeated identical calls.
- Only the twelve roles can be spawned. `general` and `explore` are off. The source sets `subagent_depth` to 1. `home/dot_config/opencode/plugins/task-authorization.js` raises it to 2, so a lead can spawn `planner` or `coordinator` and they can spawn their roles. Without the plugin, nesting is off.
- The pinned CLI expands `@` mentions in a model-written task prompt before it checks permissions. An agent mention skips task authorization and a file mention skips the read check. The plugin rejects unquoted `@` references, rechecks caller and session rules before each task, refuses ask rules and unknown context, and requires a resume to match its parent and role.
- `.zshrc` exports `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`, which enables background `task` calls, and `OPENCODE_ENABLE_EXA=1`, which enables the `websearch` tool.
- Quit and restart OpenCode after a config change. `/thinking` shows reasoning summaries. OpenCode's own status display replaces the custom status line.

## MCP and auth

`mcp.toml` declares Expo (`EXPO_TOKEN`), Notion (OAuth), and `context7` (`CONTEXT7_TOKEN`).

| Host | Registration | Log in after the first apply |
|---|---|---|
| Claude Code | Script 40 runs `claude mcp add --scope user` into `~/.claude.json` and stores `${VAR}` literally | Notion through `/mcp` |
| Codex | `mcp_servers` in `config.toml` with `bearer_token_env_var`. Write tools go to automatic review | `codex login`, then `codex mcp login Notion` |
| OpenCode | `mcp` in `opencode.json`, with `Bearer {env:VAR}` headers and OAuth off for token servers | `/connect` for the OpenAI provider, then `opencode mcp auth Notion` |

Script 40 compares each server with its entry in `~/.claude.json` by URL and `Authorization` header. It adds a missing server, re-registers a changed one, and skips an unchanged one, because re-registering clears its OAuth login. A server deleted from `mcp.toml` stays registered. Remove it with `claude mcp remove --scope user <name>`.

Playwright runs headless with a throwaway profile (`--headless --isolated`) and writes screenshots to `/tmp/agent/playwright`. On Claude Code and Codex, only `tester`, `uxui-designer`, and `uxui-design-review` start it, as an MCP server in their own role files. OpenCode has no per-agent MCP process config, so it connects Playwright globally and allows its tools only for those three roles.

## Claude Code extras

- **Status line.** `home/dot_claude/statusline.sh` reads `git status` and passes the session JSON to `statusline.jq`. The row shows session time, model and effort, path, branch with `+staged *unstaged ?untracked`, cost, a context gauge, the context window size, and the session name. Colours are terminal palette slots, so the Ghostty theme decides them. The icons need a Nerd Font. A narrow terminal truncates the session name first, then shortens the path to its last directory.
- **plan-band mod.** `home/dot_claude/mods/plan-band/` renders to `~/.claude/mods/plan-band`, and `CLAUDE_CODE_PLUGIN_DIRS` in `settings.json` loads it in every session. It shows a band above the prompt with a checkbox plan's phase and parts, the `progress.md` ledger, running agents, and usage-limit pace. It sends a notification when a part is done, a phase ships, the usage pace worsens, or the run pauses, stops, or waits on you. After a usage limit resets, it asks an open plan run to continue. `/plan-band` takes `use <plan dir>`, `pane`, `hide`, `show`, `resume`, and `auto-resume on|off`. Its tests in `tests/` use `claude-code/testing`. CI does not run them.
- **Editor bridge.** In `nvim`, `codecompanion.nvim` chats through its `claude_code` adapter, which runs `claude-agent-acp`. mise pins that bridge next to `claude`. Pick the bridge release whose `@anthropic-ai/claude-agent-sdk` dependency matches the `claude` pin. `<leader>aa` toggles the chat, and on a visual selection it adds that code to the chat.
- **Other settings.** Thinking summaries are on, notifications go to Ghostty, and commit and PR attribution is empty.

## Decisions

- 2026-10-01: The advisor is off by default. Every subagent inherits it and each call re-reads the whole transcript, so as a default it was two thirds of a plan run's cost.
- 2026-10-10: Agents that wait get a 1-hour prompt cache. With the 5-minute default, each wait re-wrote the whole context, which was 44% of one measured plan run's cost. A 1-hour write costs 2x input instead of 1.25x, so short-lived agents keep the default.
- 2026-10-10: `tester` tried haiku and went back to sonnet the same day. Haiku cost about 5% as much, but it ran more turns, applied the brief too rigidly, and deleted its evidence. Do not retry without a newer Haiku release.
- 2026-10-13: `planner` moved from fable to opus. In a blind comparison on one phase, both judges ranked two Opus plans above two Fable plans on correctness against the code. Opus cost about $6.50 to $7.00 per plan against $7.80 to $10.80 for Fable.
- 2026-10-13: `ship-reviewer` gets the 1-hour cache. It waits 8 to 10 minutes at a time on full suite runs, so in two measured phases each wake re-wrote about 200k tokens, $7 to $15 per ship review. `reviewer` keeps the default because the higher price of its ordinary writes would outweigh the rewrites it saves.

## Validation

`.github/workflows/ci.yml` checks this config on every push to `main` and every pull request. Its step names say what each check covers, and the README's CI section shows how to run them locally.
CI does not cover real model access, MCP authentication, browser operation, terminal notifications, Claude Code's runtime permission decisions, or full-access Codex command execution. Check those on the machine.
