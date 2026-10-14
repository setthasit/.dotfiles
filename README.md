# dotfiles

The setup of one macOS (Apple Silicon) development machine, managed with [chezmoi](https://chezmoi.io).
It holds the shell, the terminal, two Neovim profiles, Homebrew packages, language runtimes, and the config of three coding agents: Claude Code, Codex, and OpenCode.
No secret, name, email, or home path is committed.

## New machine

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install chezmoi
chezmoi init --apply https://github.com/setthasit/.dotfiles.git
cp ~/.zshrc.local.example ~/.zshrc.local && chmod 600 ~/.zshrc.local
$EDITOR ~/.zshrc.local   # fill in the secrets, see Secrets below
exec zsh
```

`chezmoi init` asks once for your git name, git email, and work repo directory.
`--apply` writes every managed file and clones oh-my-zsh and powerlevel10k.
It then runs the four bootstrap scripts in `home/`, in this order:

1. `run_onchange_after_10-brew-bundle.sh.tmpl` installs the `Brewfile` and never upgrades a package that is already installed.
2. `run_onchange_after_20-mise-install.sh.tmpl` installs every pin in the mise config.
3. `run_onchange_after_30-herdr-integrations.sh.tmpl` installs herdr's agent-state hooks for Claude Code and Codex.
4. `run_onchange_after_40-claude-mcp.sh.tmpl` registers the shared MCP (Model Context Protocol) servers with Claude Code.

chezmoi runs a script again when its rendered text changes.
Scripts 10 to 30 embed a hash of the `Brewfile` or the mise config. Script 40 embeds the `claude` path and the server list.

The clone uses HTTPS because the new machine has no SSH key yet.
To push from it later, run `chezmoi cd`, then `git remote set-url origin git@github.com:setthasit/.dotfiles.git`.

## Daily use

| Task | Command |
|---|---|
| Edit a managed file | `chezmoi edit ~/.zshrc`, then `chezmoi apply` |
| Adopt a file changed in place | `chezmoi add ~/.zshrc` |
| Adopt a change to a file rendered from a `.tmpl` source | `chezmoi diff <file>`, then merge it into the source by hand |
| Delete a managed file | Delete it from `home/` and add its target path to `home/.chezmoiremove`. `chezmoi apply` never removes a file that only vanished from the source |
| See local drift | `chezmoi status` or `chezmoi diff` |
| Pull changes from another machine | `chezmoi update` |
| Add a Homebrew package | Install it, then add one line to `Brewfile` by hand |
| Pin a CLI with mise | `mise use -g <tool>@<version>`, then `chezmoi add ~/.config/mise/config.toml` |
| Remove a package | Delete its `Brewfile` line, then follow [Removing a package](#removing-a-package) |
| Check the Brewfile against this machine | `brew bundle check --verbose` |
| Start Docker | `colima start`. colima runs the daemon the `docker` CLI talks to |

## Layout

| Path | Holds |
|---|---|
| `home/` | The chezmoi source. `.chezmoiroot` points chezmoi here. Every path in this README is relative to the repo root |
| `home/.chezmoidata/` | Data the templates read: agent roles, MCP servers, denied commands, secret paths, protected agent config |
| `home/.chezmoitemplates/` | Template fragments that several files include |
| `home/dot_config/ai/AGENTS.md.tmpl` | The agent policy that all three agent hosts load |
| `home/dot_claude/`, `home/private_dot_codex/`, `home/dot_config/opencode/` | Config for Claude Code, Codex, and OpenCode |
| `home/dot_claude/mods/plan-band/` | A Claude Code mod that shows the state of a checkbox plan run above the prompt |
| `home/dot_agents/skills/` | The agent skills, rendered to `~/.agents/skills/` |
| `home/run_onchange_after_*.sh.tmpl` | The four bootstrap scripts |
| `Brewfile` | Homebrew packages |
| `docs/agent-configuration.md` | How the agent config fits together, and how to change it |
| `.github/` | The CI (continuous integration) workflow, its check scripts, and the chezmoi data CI renders with |
| `tests/` | Unit tests for the plan checker, the skill checker, the image script, and the Claude MCP script |

## Homebrew vs mise

- Homebrew owns desktop apps (casks), system libraries, macOS services, and CLI tools that track one global version.
- mise owns language runtimes, Neovim, and every CLI whose version a project or CI has to match. A tool moves to mise when a repo needs to pin it.
- Nothing is installed by both.
- A tool that updates itself is pinned in mise with its updater off. Claude Code has `DISABLE_AUTOUPDATER` in `settings.json`. OpenCode has `OPENCODE_DISABLE_AUTOUPDATE` in `.zshrc`. Codex has `check_for_update_on_startup = false`. herdr has no switch, so never run `herdr update`. Bump its pin instead.
- `~/.local/bin` comes before mise on `PATH`. Delete a native Claude Code install at `~/.local/bin/claude`, or it shadows the pin.
- A project pins its own versions in its `.mise.toml`. `.nvmrc` files are honoured.

The `Brewfile` is written by hand. Its header holds the rules for editing it and for trusting third-party taps.

### Removing a package

Delete the line, then reconcile the machine in this order:

```sh
# 1. formulae from third-party taps first, while their taps are still trusted
brew uninstall <formula>...

# 2. then everything else the Brewfile no longer lists, always with the type flags
brew bundle cleanup --formula --cask --tap --force --file="$(chezmoi git -- rev-parse --show-toplevel)/Brewfile"

# 3. dependencies left without a parent
brew autoremove
```

Two traps:

- **Always pass `--formula --cask --tap`.** With no type flag, `brew bundle cleanup` also cleans every other type it supports: VS Code extensions, npm, cargo, go, uv, krew, and Mac App Store apps. This Brewfile lists none of those, so a bare `brew bundle cleanup --force` removes all of them from the machine.
- **Uninstall tap formulae before untapping.** Cleanup resets tap trust to what the Brewfile declares. It cannot uninstall a formula it may no longer load, so it untaps and leaves the keg behind in `/opt/homebrew/bin`. To recover a stranded keg, run `brew trust <tap>`, uninstall, then untap.

## iOS Neovim profile

`nvim-ios` is a `.zshrc` alias for `NVIM_APPNAME=nvim-ios nvim`, a LazyVim profile for Swift. Plain `nvim` loads no Swift plugin.

- Its LazyVim extras are nvim-cmp, yanky, `dap.core`, and the git, json, markdown, toml, and yaml language extras.
- `xcodebuild.nvim` drives builds, the simulator, tests, code coverage, and the debugger. `<leader>i` is its key group, `<leader>I` opens its action picker, and its debug keys sit under `<leader>d`.
- `sourcekit-lsp` comes from Xcode, not Mason. mise pins `xcbeautify`, `swiftformat`, `swiftlint`, and `cocoapods`. The Brewfile adds `xcode-build-server` and `xcp`.
- Run `:XcodebuildSetup` once per project to pick the scheme, device, and test plan. It writes `<project>/.nvim/xcodebuild/settings.json` and `buildServer.json`. Both hold machine-local paths, so ignore them in that project's `.gitignore`. `:checkhealth xcodebuild` reports missing tools.
- Debugging uses the `lldb-dap` that ships with Xcode.
- Only the simulator works out of the box. A physical device also needs `pipx install pymobiledevice3`, and on iOS 17 and later a passwordless-sudo helper. This repo does not install either.

Both Neovim profiles manage `lazyvim.json`. LazyVim rewrites it when you toggle an extra, so `chezmoi diff` shows that change until you run `chezmoi re-add`.

## Agents

One policy file, `home/dot_config/ai/AGENTS.md.tmpl`, reaches Claude Code, Codex, and OpenCode.
To change a rule, edit that file, then run `chezmoi apply`.
Roles, models, permissions, MCP servers, and every other change are in [docs/agent-configuration.md](docs/agent-configuration.md).

## Deliberately not managed

chezmoi manages only what is under `home/`. These paths stay on the machine and out of the repo.
`chezmoi add` skips a path that `home/.chezmoiignore` lists.

| Path | Why | In `.chezmoiignore` |
|---|---|---|
| `~/.config/gh` | GitHub account identity and OAuth state | yes |
| `~/.config/k9s` | Cluster and context names | yes |
| `~/.gitconfig.work` | Work git identity for repos under the work directory | yes |
| `~/.agents/skills/backend-architecture` | A work-specific skill. Copy it by hand from a private source | yes |
| `~/.claude.json` | Claude Code account, project history, and user-scope MCP servers | yes |
| Codex state in `~/.codex`: auth, sessions, history, herdr's `hooks.json` and `hooks/`, `rules/default.rules` | Machine-local, often holds credentials | yes, everything except the managed files |
| OpenCode state: `~/.local/share/opencode`, `~/.local/state/opencode`, `~/.cache/opencode` | Machine-local, holds credentials | yes |
| Claude Code state in `~/.claude`: sessions, history, caches, herdr's `hooks/herdr-agent-state.sh` | Machine-local | no |

herdr writes its own hook files to match the installed herdr version. Claude Code's `SessionStart` hook entry is managed in `settings.json`.

## Secrets

No credential is committed. `~/.zshrc.local` exports them. It is unmanaged, mode 600, and `.zshrc` sources it last. Every consumer names the variable and never stores its value:

| Variable | Read by |
|---|---|
| `EXPO_TOKEN`, `CONTEXT7_TOKEN` | MCP bearer tokens. Claude Code stores `${EXPO_TOKEN}` literally in `~/.claude.json`. Codex names the variable in `bearer_token_env_var`. OpenCode uses `{env:EXPO_TOKEN}` in a header |
| `OPENAI_API_KEY` | The `image-generation` skill script, at run time |
| `TYPESAFE_API_KEY` | Nothing in this repo. It is listed in `home/dot_zshrc.local.example` only |

Notion uses OAuth and needs no variable. Check a file for literal secrets before you `chezmoi add` it.

## Identity and absolute paths

No name, email, hostname, or home path is committed.
`home/.chezmoi.toml.tmpl` asks for the git identity and the work repo directory once and stores them in `~/.config/chezmoi/chezmoi.toml`.
`home/dot_gitconfig.tmpl` renders them into `~/.gitconfig`. Repos under the work directory take their identity from `~/.gitconfig.work`. An empty work directory leaves that include out.
When a pull adds a new prompt, `chezmoi apply` fails until `chezmoi init` asks for it.
A file that needs a home path uses `{{ .chezmoi.homeDir }}` in a `.tmpl` source.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, on a macOS runner. Each step's `name` says what it checks.
gitleaks only detects a secret after the push. Turn on GitHub push protection to block one before it lands.

From the repo root, with the mise pins on `PATH`:

```sh
gitleaks git . --redact --no-banner
./.github/scripts/check-identity-leak.sh
./.github/scripts/check-claude-skill-links.sh
./.github/scripts/check-em-dash.sh
./.github/scripts/check-statusline.sh
python3 .github/scripts/check-codex.py
python3 .github/scripts/check-opencode.py
python3 -m unittest discover -s tests -v
brew bundle list --file=Brewfile > /dev/null
```

The other checks read a rendered home directory. This renders one into a temp directory the way CI does:

```sh
ci=$(mktemp -d)
python3 .github/scripts/render-home.py "$ci/home"
python3 .github/scripts/check-approvals.py "$ci/home"
python3 .github/scripts/check-claude.py "$ci/home"
python3 "$ci/home/.agents/skills/writing-for-agents/scripts/check_skills.py"
claude plugin test "$ci/home/.claude/mods/plan-band"
rm -rf "$ci"
```
