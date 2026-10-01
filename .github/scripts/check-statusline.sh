#!/bin/sh
# Claude Code blanks the whole status row when the script fails, and truncates
# it when the output is wider than the row.
set -eu

sandbox=$(mktemp -d)
trap 'rm -rf "$sandbox"' EXIT

repo="$sandbox/work/project"
git init --quiet --initial-branch=feat/gauge "$repo"
touch "$repo/staged" "$repo/untracked"
git -C "$repo" add staged

status=0
escape=$(printf '\033')

render() {
	HOME="$sandbox" COLUMNS="$1" bash dot_claude/statusline.sh | sed "s/$escape\[[0-9;]*m//g"
}

words() {
	jq -Rr 'gsub("[^ -~]"; "") | gsub(" +"; " ") | ltrimstr(" ") | rtrimstr(" ")'
}

expect() {
	label=$1 actual=$2 expected=$3
	if [ "$actual" != "$expected" ]; then
		printf 'FAIL: %s\n  expected: %s\n  actual:   %s\n' "$label" "$expected" "$actual" >&2
		status=1
	fi
}

session=$(jq -n --arg dir "$repo" '{
	session_name: "Implement the context gauge for the status line",
	model: {display_name: "Opus 5.5"},
	effort: {level: "high"},
	workspace: {current_dir: $dir},
	cost: {total_cost_usd: 60.649, total_duration_ms: 39840000},
	context_window: {context_window_size: 1000000, used_percentage: 14}
}')

wide=$(printf '%s' "$session" | render 164)
expect 'wide row fills the padded width' "$(printf '%s' "$wide" | jq -Rr length)" 160
expect 'wide row keeps every segment' \
	"$(printf '%s' "$wide" | words)" \
	"11h4m Opus 5.5 high ~/work/project feat/gauge +1 ?1 \$60.65 14% 1M Implement the context gauge for the status line"

narrow=$(printf '%s' "$session" | render 88)
expect 'narrow row stays inside the padded width' "$(printf '%s' "$narrow" | jq -Rr length)" 84
expect 'narrow row drops to the directory name and no session name' \
	"$(printf '%s' "$narrow" | words)" \
	"11h4m Opus 5.5 high project feat/gauge +1 ?1 \$60.65 14% 1M"

expect 'missing fields still render one row' "$(printf '{}' | render 80 | wc -l | tr -d ' ')" 1

exit "$status"
