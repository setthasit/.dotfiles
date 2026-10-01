#!/bin/sh
# Claude Code reads ~/.claude/skills only. A shared skill with no link there is
# silently invisible to it, and a link with no skill dangles.
set -eu

status=0

for dir in dot_agents/skills/*/; do
	name=$(basename "$dir")
	if [ ! -f "dot_claude/skills/symlink_$name.tmpl" ]; then
		printf 'FAIL: %s has no dot_claude/skills/symlink_%s.tmpl\n' "$dir" "$name" >&2
		status=1
	fi
done

for link in dot_claude/skills/symlink_*.tmpl; do
	name=$(basename "$link" .tmpl)
	name=${name#symlink_}
	# backend-architecture is unmanaged on purpose. Its link renders empty without it.
	[ "$name" = backend-architecture ] && continue
	if [ ! -d "dot_agents/skills/$name" ]; then
		printf 'FAIL: %s points at a skill that is not in dot_agents/skills\n' "$link" >&2
		status=1
	fi
done

exit "$status"
