# Hand-maintained: this file declares intent, not machine state.
# Do NOT regenerate with `brew bundle dump` — dump re-adds every transitive
# dependency and every VS Code extension, and `brew bundle install` marks each
# listed formula installed-on-request, so a dumped file never shrinks again.
# Add a line when you deliberately want a tool; let brew resolve dependencies.
# Verify with `brew bundle check --verbose`. Removing an entry needs a scoped
# `brew bundle cleanup --formula --cask --tap` — see README "Removing a package".

# Formula sources. Trust is granted per item on the entry lines below, never per tap:
# brew refuses to load a formula or cask from an untrusted tap, and an item-level grant
# covers exactly that entry, not everything else the tap ships now or later.
tap "carlocab/personal"
tap "felixkratz/formulae", "https://github.com/FelixKratz/homebrew-formulae"
tap "getsentry/tools"
tap "getsentry/xcodebuildmcp"
tap "mongodb/brew"
tap "nikitabobko/tap"
tap "tink-crypto/tink-tinkey", "https://github.com/tink-crypto/tink-tinkey"

# mise owns language runtimes and every version-pinned CLI (terraform, opentofu, kubectl,
# helm, k9s, pulumi, atlas, buf, golangci-lint, k6, tuist, stripe, herdr).
# Nothing below may duplicate one — see .config/mise/config.toml.
brew "mise"

# Shell, search, files
brew "chezmoi"
brew "coreutils"
brew "gnu-sed"
brew "fzf"
brew "ripgrep"
brew "jq"
brew "wget"
brew "tmux"
brew "rclone"
brew "watchman"
brew "carlocab/personal/unrar", trusted: true

# Editors
brew "neovim"
brew "lua"
brew "tree-sitter-cli"

# Git
brew "gh"
brew "lazygit"
brew "mercurial"

# Containers: compose is a docker CLI plugin, colima supplies the daemon.
brew "docker"
brew "docker-compose"
brew "colima"
brew "qemu"
brew "crane"

# Kubernetes — kubectl, helm, and k9s are pinned by mise
brew "argocd"

# Cloud provider CLIs
brew "azure-cli"
brew "doctl"
cask "gcloud-cli"

# Databases, migrations, schema tooling
brew "postgresql@14", link: false
brew "libpq", link: true
brew "mongosh"
brew "mongodb/brew/mongodb-database-tools", trusted: true
brew "golang-migrate"

# Web serving
brew "http-server"

# iOS, Xcode, mobile
brew "cocoapods"
brew "kdoctor"
brew "xcbeautify"
brew "xcode-build-server"
brew "getsentry/xcodebuildmcp/xcodebuildmcp", trusted: true

# Diagrams, documents, media conversion
brew "d2"
brew "jsonnet"
brew "graphviz"
brew "ghostscript"
brew "ffmpeg"
brew "imagemagick"

# Crypto and key management
brew "gnupg"
brew "step"
brew "tink-crypto/tink-tinkey/tinkey", trusted: true

# Service and agent CLIs
brew "getsentry/tools/sentry-wizard", trusted: true
brew "pipx"

# macOS window manager, statusbar, display control
brew "felixkratz/formulae/sketchybar", trusted: true
cask "nikitabobko/tap/aerospace", trusted: true
cask "monitorcontrol"

# Terminals and fonts
cask "ghostty"
cask "font-hack-nerd-font"
cask "font-jetbrains-mono-nerd-font"

# Coding agents
cask "claude-code"
cask "codex"

# Android platform tools
cask "android-platform-tools"
