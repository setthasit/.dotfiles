#!/usr/bin/env bash
set -euo pipefail

session=$(cat)
workdir=$(jq -r '.workspace.current_dir // .cwd // "."' <<<"$session")
git_status=$(git -C "$workdir" --no-optional-locks status --porcelain=v2 --branch 2>/dev/null || true)

jq -r --arg git_status "$git_status" -f "$(dirname "${BASH_SOURCE[0]}")/statusline.jq" <<<"$session"
