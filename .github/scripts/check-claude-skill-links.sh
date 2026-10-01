#!/bin/sh
# Claude Code reads ~/.claude/skills only. A shared skill with no link there is
# silently invisible to it, and a link with no skill dangles.
set -eu

skills=home/dot_agents/skills
links=home/dot_claude/skills
status=0

for dir in "$skills"/*/; do
	name=$(basename "$dir")
	if [ ! -f "$links/symlink_$name.tmpl" ]; then
		printf 'FAIL: %s has no %s/symlink_%s.tmpl\n' "$dir" "$links" "$name" >&2
		status=1
	fi
done

for link in "$links"/symlink_*.tmpl; do
	name=$(basename "$link" .tmpl)
	name=${name#symlink_}
	if [ ! -d "$skills/$name" ]; then
		printf 'FAIL: %s points at a skill that is not in %s\n' "$link" "$skills" >&2
		status=1
	fi
done

exit "$status"
