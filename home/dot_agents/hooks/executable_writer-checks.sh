#!/usr/bin/env bash
# Writer stop gate. Runs a repo's own .agents/writer-checks.sh on the files a
# writer changed, and sends a failure back to the writer with exit 2. Runs only
# in repos listed in ~/.config/ai/writer-checks.allow, because the script is
# repo code.
set -uo pipefail

input=$(cat)
[ "$(jq -r '.stop_hook_active // false' <<<"$input")" = true ] && exit 0

cwd=$(jq -r '.cwd // empty' <<<"$input")
[ -n "$cwd" ] || exit 0
root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || exit 0
grep -qxF "$root" "$HOME/.config/ai/writer-checks.allow" 2>/dev/null || exit 0
script="$root/.agents/writer-checks.sh"
[ -x "$script" ] || exit 0

files=$({
  git -C "$root" diff --name-only HEAD
  git -C "$root" ls-files --others --exclude-standard
} | sort -u)
[ -n "$files" ] || exit 0

output=$(cd "$root" && printf '%s\n' "$files" | timeout 540 "$script" 2>&1)
status=$?
[ "$status" -eq 0 ] && exit 0

{
  echo "Writer checks failed (exit $status): .agents/writer-checks.sh"
  printf '%s\n' "$output" | tail -n 40
  echo "Fix a failure in your Files, then finish. A failure outside your Files: name it in your report and finish."
} >&2
exit 2
