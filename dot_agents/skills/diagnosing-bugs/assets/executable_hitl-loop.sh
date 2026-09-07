#!/usr/bin/env bash
# Human-in-the-loop reproduction script. The HUMAN runs this; the agent never
# does (it blocks on stdin). Edit the stage/step/capture lines for this bug.
set -u

CAPTURED=''

stage() {
	printf '\n=== %s ===\n' "$1"
}

# step "instruction" — print it, wait for the human to finish.
step() {
	printf '  -> %s\n' "$1"
	printf '     press Enter when done: '
	read -r _ack || exit 1
}

# capture KEY "prompt" — read one value with echo off; never printed here.
capture() {
	printf '  ?  %s: ' "$2"
	stty -echo 2>/dev/null || true
	IFS= read -r _value || exit 1
	stty echo 2>/dev/null || true
	printf '\n'
	CAPTURED="${CAPTURED}$1=${_value}
"
	unset _value
}

# Final hand-off: KEY=VALUE lines for the agent to parse.
report() {
	printf '\n=== CAPTURED ===\n%s' "$CAPTURED"
}

# ---------------------------------------------------------------- edit below

stage 'Stage 1 - sign in'
step 'Open https://app.example.com in a normal browser window'
step 'Sign in as the tenant that sees the bug'
capture SESSION_COOKIE 'paste the value of the session cookie'

stage 'Stage 2 - reproduce'
step 'Click Export, wait until the spinner stops'
step 'Open devtools > Network, select the failed request'
capture REQUEST_ID 'paste the x-request-id response header'
capture STATUS_CODE 'type the status code'

report
