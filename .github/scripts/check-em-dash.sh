#!/bin/sh
set -eu

em_dash=$(printf '\342\200\224')
grep_no_match=1

find_em_dashes() {
	LC_ALL=C grep -nH -e "$em_dash" "$@" || [ "$?" -eq "$grep_no_match" ]
}

hits=$(
	find_em_dashes \
		home/dot_config/ai/AGENTS.md.tmpl \
		home/.chezmoitemplates/autonomy-policy \
		home/dot_claude/CLAUDE.md.tmpl \
		home/private_dot_codex/AGENTS.md.tmpl \
		home/dot_config/opencode/AGENTS.md.tmpl \
		home/dot_claude/agents/*.md
	find_em_dashes -r --include='*.md' home/dot_agents/skills
)

if [ -n "$hits" ]; then
	printf '%s\n' "$hits" | awk -F: '{ printf "FAIL: %s:%s\n", $1, $2 }' >&2
	exit 1
fi
