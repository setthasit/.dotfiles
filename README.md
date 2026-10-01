# dotfiles

macOS (Apple Silicon) development machine, managed with [chezmoi](https://chezmoi.io).
Shell, terminal, editors, Homebrew packages, language runtimes, and the coding-agent
config in one repo. No secrets — see [Secrets](#secrets).

## New machine

```sh
# 1. Homebrew, if missing
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. chezmoi does the rest: clone, prompt for git identity, apply, bootstrap
brew install chezmoi
chezmoi init --apply https://github.com/setthasit/.dotfiles.git

# 3. Secrets (never in the repo)
cp ~/.zshrc.local.example ~/.zshrc.local
chmod 600 ~/.zshrc.local
$EDITOR ~/.zshrc.local
exec zsh
```

`chezmoi init --apply` writes every managed file, clones oh-my-zsh + powerlevel10k, then runs
the bootstrap scripts in order: `brew bundle install --no-upgrade` (taps, formulae, casks, and
the per-entry tap trust the Brewfile declares), `mise install` (language runtimes, the
version-pinned CLIs, and herdr), `herdr integration install` for omp and claude (agent state
hooks), `claude mcp add` for the user-scope MCP servers.

HTTPS on purpose: step 2 runs before any SSH key exists on the machine. Once keys are in
place, `chezmoi cd && git remote set-url origin git@github.com:setthasit/.dotfiles.git` to
push from there.

`herdr` comes from mise, so the hook script runs right after `mise install`. It resolves the
binary with `mise which` when the shims are not yet on `PATH`, exits cleanly without one, and
regenerates the omp and claude hooks and `~/.zsh/completions/_herdr` whenever the mise pin
moves. The MCP script skips a machine without Claude Code and re-runs once `claude` appears on
`PATH`.

## Daily use

| Task | Command |
|---|---|
| Edit a managed file | `chezmoi edit ~/.zshrc` then `chezmoi apply` |
| Adopt a file changed in place | `chezmoi add ~/.zshrc` |
| Delete a managed file | delete it from the source dir **and** list its target path in `.chezmoiremove` — `chezmoi apply` never removes a file that merely vanished from the source |
| See local drift | `chezmoi status` / `chezmoi diff` |
| Pull changes from another machine | `chezmoi update` |
| Add a package | install it, then add one line to `Brewfile` by hand |
| Pin a CLI with mise instead | `mise use -g <tool>@<version>` then `chezmoi add ~/.config/mise/config.toml` |
| Remove a package | drop its `Brewfile` line, then [clean up](#removing-a-package) |
| Check the Brewfile still matches this machine | `brew bundle check --verbose` |

## What is managed

**Shell** — `.zshrc`, `.zshenv`, `.zprofile`, `.p10k.zsh`.
oh-my-zsh and powerlevel10k are `.chezmoiexternal.toml` git clones, so `omz update` keeps working.

**Terminal** — ghostty (`~/.config/ghostty/config`, the XDG path, not the
`Library/Application Support` one).

**Editors** — nvim + nvim-ios (LazyVim, two `NVIM_APPNAME` profiles, see
[iOS profile](#ios-profile-nvim-ios)), VS Code `settings.json`, `.ideavimrc`. `~/.config/zed`
and `.wezterm.lua` are still managed but their programs are no longer installed — keep them
for a reinstall or delete both.

**Containers** — the `docker` CLI and `docker-compose` come from Homebrew, the daemon from
colima (`colima start`, docker context `colima`). OrbStack is gone, so nothing works until
colima is up. `docker buildx` is not installed; `docker compose build` falls back to the
legacy builder and works.

**CLI** — git (identity templated per machine), herdr. `gh` and `k9s` keep their own state
directories and stay unmanaged, see [Deliberately not managed](#deliberately-not-managed).

**Toolchains** — `~/.config/mise/config.toml` pins node, python, go, java, kotlin, bun, deno,
plus the CLIs whose version a project or CI has to match: terraform, opentofu, kubectl, helm,
k9s, pulumi, atlas, buf, golangci-lint, k6, tuist, stripe — and herdr, claude, opencode, and
codex, see Boundary below.
mise replaced nvm, pyenv, gvm, rbenv, and sdkman: one config, one `eval` line in `.zshrc`,
coherent `JAVA_HOME`/`GOROOT`, interactive shell startup down from ~2.0 s to ~0.7 s.
Per-project pins go in a project-local `.mise.toml` and override the global floor;
`.nvmrc` is still honoured.

Boundary: **Homebrew** owns GUI casks, system libraries, macOS services, and CLI tools that
track one global version. **mise** owns language runtimes and version-pinned dev CLIs.
Nothing is installed by both. A tool moves to mise when a repo needs to pin it — that is why
`tuist` left the Brewfile: its tap only ships versioned formulae (`tuist@4.109.1`), which is
a version manager reimplemented badly. A tool that ships its own updater moves too: `herdr`
is in homebrew-core, but `herdr update` overwrites the binary behind its package manager's
back, so mise holds one pinned version and `herdr update` stays unused — bump the pin instead.
The agent CLIs follow the same rule. Claude Code and OpenCode update themselves in the
background, so each pin is paired with a switch that stops it: `DISABLE_AUTOUPDATER` in
`~/.claude/settings.json` and `OPENCODE_DISABLE_AUTOUPDATE` in `.zshrc`. Codex only checks
for a newer release and never installs one. `~/.opencode/bin` is off `PATH`, and a native
Claude Code install at `~/.local/bin/claude` has to be removed, because `~/.local/bin` sits
ahead of mise on `PATH` and would shadow the pin.

`Brewfile` is hand-maintained and grouped by function: one line per tool you deliberately
want, dependencies left to brew. Never regenerate it with `brew bundle dump` — dump re-emits
every transitive dependency and every VS Code extension, and `brew bundle install` marks each
listed formula installed-on-request, so a dumped file only ever grows. It also silently skips
formulae from untrusted taps, which is how `k9s`, `sketchybar`, `terraform`, and nine others
went missing from the previous generated file.

Third-party taps ship code that runs at install time, so Homebrew refuses to load their
formulae until trusted. The Brewfile grants that trust **per entry**, on the entry line, never
per tap: `brew "derailed/k9s/k9s", trusted: true` covers exactly that formula, while
`tap "derailed/k9s", trusted: true` would cover everything the tap ever ships. Casks need the
fully qualified token — `cask "aerospace"` grants nothing, `cask "nikitabobko/tap/aerospace"`
does. `brew bundle install` registers the grants before anything loads.

### iOS profile (nvim-ios)

`nvim-ios` (the alias in `.zshrc`) is the Swift profile: LazyVim trimmed to git/json/markdown/
toml/yaml plus `dap.core`, rose-pine, and `xcodebuild.nvim` driving builds, the simulator, the
test explorer, code coverage, and the debugger. The general-purpose profile stays `nvim` — no
Swift plugin loads there.

`sourcekit-lsp` comes from Xcode, never Mason. The rest are Brewfile entries: `xcbeautify`,
`xcode-build-server`, `swiftformat`, `swiftlint`, `xcp`, `jq`, `ripgrep`, `coreutils`.
Debugging uses the `lldb-dap` bundled with Xcode 16+, so nothing extra is downloaded.
Physical-device debugging additionally needs `pipx install pymobiledevice3`, and on iOS 17+
a passwordless-sudo helper that this repo deliberately does not install — simulator only
out of the box.

Per project, run `:XcodebuildSetup` once to pick project, scheme, device, and test plan. It
writes `<project>/.nvim/xcodebuild/settings.json` and regenerates `buildServer.json`; both
hold machine-local paths and simulator UDIDs, so they belong in that project's `.gitignore`,
not here. `:checkhealth xcodebuild` reports any missing CLI.

Keys: `<leader>i` is the iOS group (`<leader>I` opens the action picker), debugging sits in
LazyVim's `<leader>d` group.

### Removing a package

Drop the line, then reconcile the machine. Two traps make this less obvious than it looks.

```sh
# 1. tap formulae FIRST, while their taps are still trusted
brew uninstall <formula>...

# 2. then formulae, casks, taps — always scoped
brew bundle cleanup --formula --cask --tap --force --file="$(chezmoi source-path)/Brewfile"

# 3. dependencies orphaned by the above
brew autoremove
```

**Always pass `--formula --cask --tap`.** With no type flags, `brew bundle cleanup` also enables
its `vscode`, `npm`, `cargo`, `go`, `uv`, `krew`, and `mas` handlers. This Brewfile declares
none of those, so a bare `brew bundle cleanup --force` would remove every VS Code extension,
global npm package, cargo crate, go binary, krew plugin, and Mac App Store app on the machine.

**Uninstall tap formulae before untapping.** Cleanup resets the trust store to what the Brewfile
declares, and it cannot uninstall a formula it is no longer allowed to load — it untaps the tap
and silently leaves the keg behind, orphaned in `/opt/homebrew/bin` with no formula definition.
Uninstall first; if a keg is already stranded, `brew trust <tap>`, uninstall, then untap.

## Agent configuration

One policy file. Edit `~/.config/ai/AGENTS.md` only. Two hosts read it:

| Host | How the policy arrives | Host config managed here |
|---|---|---|
| omp | `~/.omp/agent/AGENTS.md` is a symlink to it | `config.yml`, `mcp.json`, `agents/` |
| Claude Code | `~/.claude/CLAUDE.md` is rendered from it: chezmoi inlines the whole policy at apply time | `settings.json`, `CLAUDE.md`, `agents/`, `skills/` links |

Also managed: `~/.agents/skills/` (the shared skill store) plus its `.skill-lock.json`
install manifest, and amp `settings.json`.

### Claude Code

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

**Drift.** Claude Code rewrites `~/.claude/settings.json` when `/model`, `/effort`, `/advisor`,
or a "don't ask again" answer saves a value. `chezmoi diff ~/.claude/settings.json` shows it.
The source is a template, so `chezmoi re-add` skips it: merge by hand into
`dot_claude/settings.json.tmpl`. It is a template because herdr only recognises its
`SessionStart` hook by the exact absolute command it would write itself.

In nvim, `codecompanion.nvim` is the editor-side client: its `omp` adapter spawns `omp acp`
and reuses the same credentials, skills, and `bash.patterns` approvals as the CLI. Tool calls
that OMP gates arrive as ACP permission prompts in the chat buffer. `<leader>aa` toggles the
chat, the same key on a visual selection sends that code block with its path and line range.
The LazyVim extras list (`~/.config/nvim/lazyvim.json`) is machine-local and not managed, so
a new machine gets the plugin spec but picks its own extras.

## Deliberately not managed

Nothing here is committed. The files stay on disk; `.chezmoiignore` lists them so
`chezmoi add` refuses them by accident.

| Path | Why |
|---|---|
| `~/.config/gh` | GitHub account identity and OAuth host state |
| `~/.config/k9s` | Cluster and context names |
| `~/.agents/skills/backend-architecture` | Work-specific: internal module layout and repo host |
| `~/.agents/skills-src` | Upstream skill repos cloned with their own `.git`; the installed copy under `skills/` is what agents read |
| Agent state | sessions, histories, `*.db`, caches, `~/.claude.json`, `auth.json`, `models_cache.json` — machine-local, often credential-bearing |
| VS Code extensions | 28 `vscode "…"` lines dropped from the Brewfile: churn-heavy, reinstalled from the Marketplace in seconds, and VS Code is not even a managed cask. `settings.json` is still managed |
| herdr hooks | `~/.omp/agent/extensions/herdr-omp-agent-state.ts` and `~/.claude/hooks/herdr-agent-state.sh`. Both are generated by `herdr integration install` and always match the installed herdr version. The `SessionStart` entry that calls the claude hook is managed, in `settings.json` |

Work-specific skills are excluded on purpose, so a machine bootstrapped from this repo
gets the generic setup. Restore them from a private repo or copy them by hand.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every PR, on a macOS runner
(the only OS where `.chezmoiignore` keeps ghostty and `Library`):

| Check | Guards against |
|---|---|
| `gitleaks git` over full history, allowlist in `.gitleaks.toml` | an API key or private key committed, including one committed then deleted |
| `.github/scripts/check-identity-leak.sh` | a `/Users/<name>` literal, an email literal, or a `chezmoi add` of a credential-bearing or deliberately unmanaged file, matched on the committed name and on the target name it decodes to (`private_dot_x/private_auth.json` is `.x/auth.json`) |
| `.github/scripts/check-claude-skill-links.sh` | a shared skill with no `~/.claude/skills` link, which Claude Code would silently never see |
| `chezmoi apply` into a throwaway `HOME` | a template that fails to render — a broken bootstrap on the next new machine |
| `shellcheck` on the bootstrap scripts, templated ones rendered first | a shell bug in the bootstrap path |
| `brew bundle list` | Brewfile syntax |

Externals and `run_*` scripts are excluded from the render — no network clone, no package
install. Both scans run locally too:

```sh
chezmoi apply --dry-run --verbose
./.github/scripts/check-identity-leak.sh
```

Detection, not prevention: a secret that reaches GitHub is already public. GitHub Secret
Scanning with Push Protection blocks the push instead — enable it in Settings, Code
security.

## Identity and absolute paths

No name, email, hostname, or absolute home path is committed. Git identity is prompted
once by `.chezmoi.toml.tmpl`, stored in the machine-local `~/.config/chezmoi/chezmoi.toml`,
and rendered into `~/.gitconfig` by `dot_gitconfig.tmpl`. Anything that needs a home path
uses `{{ .chezmoi.homeDir }}` in a `.tmpl` file, never a literal `/Users/<name>`.

## Secrets

No credential is ever committed. `~/.zshrc.local` (mode 600, unmanaged, gitignored) exports
them, and every consumer references the variable by name:

| Consumer | Reference |
|---|---|
| `~/.omp/agent/mcp.json` | `${EXPO_TOKEN}` |
| `~/.claude.json`, written by `claude mcp add` | `${EXPO_TOKEN}`, stored as the literal reference |
| `~/.config/amp/settings.json` | `${CONTEXT7_TOKEN}` |

Never store a token in a managed file. `chezmoi add` a file only after checking it for literals.
