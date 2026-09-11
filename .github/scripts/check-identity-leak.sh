#!/bin/sh
# Enforces the README claims "Identity and absolute paths" and "Secrets".
set -eu

VENDORED=':!dot_agents/skills'
status=0

fail() {
	printf 'FAIL: %s\n\n' "$1" >&2
	status=1
}

if git grep -InE '/Users/[A-Za-z0-9._-]+' -- . "$VENDORED" >&2; then
	fail 'absolute home path committed; use {{ .chezmoi.homeDir }} in a .tmpl file'
fi

if git grep -InE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' \
	-- . "$VENDORED" ':!*.example' ':!README.md' ':!dot_p10k.zsh' |
	grep -vE 'git@|@example\.|\.example\b|users\.noreply\.github\.com' >&2; then
	fail 'email literal committed; identity is prompted by .chezmoi.toml.tmpl'
fi

if git ls-files |
	grep -iE '(^|/)(auth|credentials?|secrets?|token)[^/]*\.(json|ya?ml|toml|txt)$|\.(pem|key|p12|pfx)$|(^|/)id_(rsa|ecdsa|ed25519)|(^|/)hosts\.ya?ml$|(^|/)\.env|(^|/)\.claude\.json$|^dot_config/(gh|k9s)/|^dot_gitconfig\.work$' >&2; then
	fail 'credential-bearing or deliberately unmanaged file committed'
fi

exit "$status"
