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
version-pinned CLIs, and herdr), `herdr integration install` for omp, claude, and codex (agent state
hooks), `claude mcp add` for the user-scope MCP servers.

HTTPS on purpose: step 2 runs before any SSH key exists on the machine. Once keys are in
place, `chezmoi cd && git remote set-url origin git@github.com:setthasit/.dotfiles.git` to
push from there.

`herdr` comes from mise, so the hook script runs right after `mise install`. It resolves the
binary with `mise which` when the shims are not yet on `PATH`, exits cleanly without one, and
regenerates the omp, claude, and codex hooks and `~/.zsh/completions/_herdr` whenever the mise pin
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

## Layout

| Path | Holds |
|---|---|
| `home/` | The chezmoi source state: every file rendered into `$HOME`, the bootstrap scripts, and the `.chezmoi*` control files. `.chezmoiroot` points chezmoi here |
| `Brewfile` | Homebrew packages, installed by the first bootstrap script |
| `docs/` | Agent configuration reference |
| `.github/` | The CI workflow, its check scripts, and the data CI renders with |

Source paths in this README and in `docs/` are relative to `home/`.

## What is managed

**Shell** — `.zshrc`, `.zshenv`, `.zprofile`, `.p10k.zsh`.
oh-my-zsh and powerlevel10k are `.chezmoiexternal.toml` git clones, so `omz update` keeps working.

**Terminal** — ghostty (`~/.config/ghostty/config`, the XDG path, not the
`Library/Application Support` one).

**Editors** — nvim + nvim-ios (LazyVim, two `NVIM_APPNAME` profiles, see
[iOS profile](#ios-profile-nvim-ios)), VS Code `settings.json`, `.ideavimrc`.
The LazyVim extras list (`lazyvim.json`) is managed for both nvim profiles. LazyVim rewrites
it when an extra is toggled, so `chezmoi diff` shows the change until `chezmoi re-add`.

**Agents** — one policy file and the host config for omp, Claude Code, and Codex, see
[Agent configuration](#agent-configuration).

**Containers** — the `docker` CLI and `docker-compose` come from Homebrew, the daemon from
colima (`colima start`, docker context `colima`). OrbStack is gone, so nothing works until
colima is up. `docker buildx` is not installed; `docker compose build` falls back to the
legacy builder and works.

**CLI** — git (identity templated per machine), herdr. `gh` and `k9s` keep their own state
directories and stay unmanaged, see [Deliberately not managed](#deliberately-not-managed).

**Toolchains** — `~/.config/mise/config.toml` pins the language runtimes, neovim, and the
CLIs whose version a project or CI has to match, plus herdr and the agent CLIs (claude,
opencode, codex), see Boundary below.
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
for a newer release and never installs one. Its managed `check_for_update_on_startup = false`
also disables that check. `~/.opencode/bin` is off `PATH`, and a native
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

`sourcekit-lsp` comes from Xcode, never Mason. mise pins `xcbeautify`, `swiftformat`, and
`swiftlint`. The Brewfile supplies `xcode-build-server`, `xcp`, `jq`, `ripgrep`, and `coreutils`.
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
brew bundle cleanup --formula --cask --tap --force --file="$(chezmoi git -- rev-parse --show-toplevel)/Brewfile"

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

One policy file, `dot_config/ai/AGENTS.md`, reaches three hosts. omp reads it through a
symlink. Claude Code and Codex get it rendered into `CLAUDE.md` and `AGENTS.md`, each followed
by a map of that host's tool names. The shared skills live in `~/.agents/skills/`, and the
MCP servers every host registers are declared once in `.chezmoidata/mcp.toml`.

Models, roles, permissions, MCP, and drift handling for each host are in
[docs/agent-configuration.md](docs/agent-configuration.md).

## Deliberately not managed

Nothing here is committed. The files stay on disk; `.chezmoiignore` lists them so
`chezmoi add` refuses them by accident.

| Path | Why |
|---|---|
| `~/.config/gh` | GitHub account identity and OAuth host state |
| `~/.config/k9s` | Cluster and context names |
| `~/.agents/skills/backend-architecture` | Work-specific: internal module layout and repo host |
| `~/.agents/skills-src` | Upstream skill repos cloned with their own `.git` |
| `~/.agents/.skill-lock.json` | Skill installer state. Every shared skill is authored here, so the install manifest is empty |
| Agent state | sessions, histories, `*.db`, caches, `~/.claude.json`, `auth.json`, `models_cache.json` — machine-local, often credential-bearing |
| VS Code extensions | 28 `vscode "…"` lines dropped from the Brewfile: churn-heavy, reinstalled from the Marketplace in seconds, and VS Code is not even a managed cask. `settings.json` is still managed |
| herdr hooks | OMP's `extensions/herdr-omp-agent-state.ts`, Claude's `hooks/herdr-agent-state.sh`, and Codex's `hooks.json`/hooks. Generated by `herdr integration install` to match the installed herdr version. Claude's `SessionStart` entry is managed in `settings.json` |

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
| `python3 .github/scripts/check-codex.py` | broken Codex templates, native config/agent/profile loading, missing shared skills, command-policy regressions, secret access, writable read-only roles, or editable live safety config. Uses the mise-pinned CLI and disposable placeholders |
| `chezmoi apply` into a throwaway `HOME` | a template that fails to render — a broken bootstrap on the next new machine |
| `check_skills.py` from the rendered `writing-for-agents` skill | a skill pointing at a missing reference, script, asset, or skill, or broken skill frontmatter |
| `shellcheck` on every tracked `*.sh` and on the bootstrap scripts, rendered first | a shell bug in the bootstrap path, the status line, or a skill asset |
| `brew bundle list` | Brewfile syntax |

Externals and `run_*` scripts are excluded from the render — no network clone, no package
install. Both scans run locally too:

```sh
chezmoi apply --dry-run --verbose
./.github/scripts/check-identity-leak.sh
python3 .github/scripts/check-codex.py
```

Detection, not prevention: a secret that reaches GitHub is already public. GitHub Secret
Scanning with Push Protection blocks the push instead — enable it in Settings, Code
security.

## Identity and absolute paths

No name, email, hostname, or absolute home path is committed. Git identity and the work
repo directory are prompted once by `.chezmoi.toml.tmpl`, stored in the machine-local
`~/.config/chezmoi/chezmoi.toml`, and rendered into `~/.gitconfig` by `dot_gitconfig.tmpl`.
Repos under the work directory take their identity from the unmanaged `~/.gitconfig.work`.
An empty answer leaves that include out. When a pull adds a prompt, `chezmoi apply` fails
on the missing value until `chezmoi init` asks for it. Anything that needs a home path
uses `{{ .chezmoi.homeDir }}` in a `.tmpl` file, never a literal `/Users/<name>`.

## Secrets

No credential is ever committed. `~/.zshrc.local` (mode 600, unmanaged) exports
them, and every consumer references the variable by name:

| Consumer | Reference |
|---|---|
| `~/.omp/agent/mcp.json` | `${EXPO_TOKEN}` |
| `~/.claude.json`, written by `claude mcp add` | `${EXPO_TOKEN}`, stored as the literal reference |
| `~/.codex/config.toml` | `bearer_token_env_var = "EXPO_TOKEN"` |

Never store a token in a managed file. `chezmoi add` a file only after checking it for literals.
