# dotfiles

macOS (Apple Silicon) development machine, managed with [chezmoi](https://chezmoi.io).
Shell, terminal, window manager, editors, Homebrew packages, language runtimes, and every
coding-agent config in one repo. No secrets — see [Secrets](#secrets).

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
the per-entry tap trust the Brewfile declares), `mise install` (language runtimes plus the
version-pinned CLIs), `herdr integration install` (agent state hooks).

HTTPS on purpose: step 2 runs before any SSH key exists on the machine. Once keys are in
place, `chezmoi cd && git remote set-url origin git@github.com:setthasit/.dotfiles.git` to
push from there.

`herdr` itself is installed by none of them — it lives in `~/.local/bin` and the hook script
exits cleanly when it is missing.

## Daily use

| Task | Command |
|---|---|
| Edit a managed file | `chezmoi edit ~/.zshrc` then `chezmoi apply` |
| Adopt a file changed in place | `chezmoi add ~/.zshrc` |
| See local drift | `chezmoi status` / `chezmoi diff` |
| Pull changes from another machine | `chezmoi update` |
| Add a package | install it, then add one line to `Brewfile` by hand |
| Pin a CLI with mise instead | `mise use -g <tool>@<version>` then `chezmoi add ~/.config/mise/config.toml` |
| Remove a package | drop its `Brewfile` line, then [clean up](#removing-a-package) |
| Check the Brewfile still matches this machine | `brew bundle check --verbose` |

## What is managed

**Shell** — `.zshrc`, `.zshenv`, `.zprofile`, `.bash_profile`, `.p10k.zsh`.
oh-my-zsh and powerlevel10k are `.chezmoiexternal.toml` git clones, so `omz update` keeps working.

**Terminal / desktop** — ghostty (`~/.config/ghostty/config`, the XDG path, not the
`Library/Application Support` one), aerospace, sketchybar.

**Editors** — nvim + nvim-ios (LazyVim, two `NVIM_APPNAME` profiles), VS Code `settings.json`,
`.ideavimrc`. `~/.config/helix`, `~/.config/zed`, and `.wezterm.lua` are still managed but
their programs are no longer installed — keep them for a reinstall or delete all three.

**Containers** — the `docker` CLI and `docker-compose` come from Homebrew, the daemon from
colima (`colima start`, docker context `colima`). OrbStack is gone, so nothing works until
colima is up. `docker buildx` is not installed; `docker compose build` falls back to the
legacy builder and works.

**CLI** — git (identity templated per machine), herdr. `gh` and `k9s` keep their own state
directories and stay unmanaged, see [Deliberately not managed](#deliberately-not-managed).

**Toolchains** — `~/.config/mise/config.toml` pins node, python, go, java, kotlin, bun, deno,
plus the CLIs whose version a project or CI has to match: terraform, opentofu, kubectl, helm,
k9s, pulumi, atlas, buf, golangci-lint, k6, tuist, stripe.
mise replaced nvm, pyenv, gvm, rbenv, and sdkman: one config, one `eval` line in `.zshrc`,
coherent `JAVA_HOME`/`GOROOT`, interactive shell startup down from ~2.0 s to ~0.7 s.
Per-project pins go in a project-local `.mise.toml` and override the global floor;
`.nvmrc` is still honoured.

Boundary: **Homebrew** owns GUI casks, system libraries, macOS services, and CLI tools that
track one global version. **mise** owns language runtimes and version-pinned dev CLIs.
Nothing is installed by both. A tool moves to mise when a repo needs to pin it — that is why
`tuist` left the Brewfile: its tap only ships versioned formulae (`tuist@4.109.1`), which is
a version manager reimplemented badly.

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

One policy file, symlinked into every agent host — edit `~/.config/ai/AGENTS.md` only:

| Symlink | Agent |
|---|---|
| `~/.omp/agent/AGENTS.md` | oh-my-pi |
| `~/.config/opencode/AGENTS.md` | opencode |
| `~/.codex/AGENTS.md` | Codex CLI |
| `~/.claude/CLAUDE.md` | Claude Code |

Also managed: `~/.agents/skills/` (the shared skill store every host reads) plus its
`.skill-lock.json` install manifest, omp `config.yml` + `mcp.json`, opencode `opencode.jsonc`,
`agent/` subagents, and `tui.json`, codex `config.toml` + `prompts/`, Claude `settings.json`,
amp `settings.json`.

## Deliberately not managed

Nothing here is committed. The files stay on disk; `.chezmoiignore` lists them so
`chezmoi add` refuses them by accident.

| Path | Why |
|---|---|
| `~/.config/gh` | GitHub account identity and OAuth host state |
| `~/.config/k9s` | Cluster and context names |
| `~/.codex/hooks.json` | Written by `herdr integration install`, contains an absolute path |
| `~/.agents/skills/backend-architecture` | Work-specific: internal module layout and repo host |
| `~/.agents/skills-src` | Upstream skill repos cloned with their own `.git`; the installed copy under `skills/` is what agents read |
| `~/.config/opencode/agent/go-code-{writer,reviewer}.md` | Work-specific: internal service and import root |
| Agent state | sessions, histories, `*.db`, caches, `~/.claude.json`, `auth.json`, `models_cache.json` — machine-local, often credential-bearing |
| VS Code extensions | 28 `vscode "…"` lines dropped from the Brewfile: churn-heavy, reinstalled from the Marketplace in seconds, and VS Code is not even a managed cask. `settings.json` is still managed |
| herdr hooks | `~/.claude/hooks/herdr-agent-state.sh`, `~/.codex/herdr-agent-state.sh`, `~/.omp/agent/extensions/herdr-omp-agent-state.ts` — generated by `herdr integration install <target>`, always matching the installed herdr version. Claude's `settings.json` hook entry is templated to match herdr's exact string, so herdr recognises it and never appends a duplicate |

Work-specific agents and skills are excluded on purpose, so a machine bootstrapped from
this repo gets the generic setup. Restore them from a private repo or copy them by hand.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every PR, on a macOS runner
(the only OS where `.chezmoiignore` keeps aerospace, sketchybar, ghostty and `Library`):

| Check | Guards against |
|---|---|
| `gitleaks git` over full history, allowlist in `.gitleaks.toml` | an API key or private key committed, including one committed then deleted |
| `.github/scripts/check-identity-leak.sh` | a `/Users/<name>` literal, an email literal, or a `chezmoi add` of a credential-bearing or deliberately unmanaged file |
| `chezmoi apply` into a throwaway `HOME` | a template that fails to render — a broken bootstrap on the next new machine |
| `shellcheck` on the plugin and bootstrap scripts, templated ones rendered first | a shell bug in the bootstrap path |
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
| `~/.config/opencode/opencode.jsonc` | `{env:CONTEXT7_TOKEN}`, `{env:EXPO_TOKEN}` |
| `~/.codex/config.toml` | `env_http_headers = { CONTEXT7_API_KEY = "CONTEXT7_TOKEN" }` |
| `~/.config/amp/settings.json` | `${CONTEXT7_TOKEN}` |

Never store a token in a managed file. `chezmoi add` a file only after checking it for literals.
