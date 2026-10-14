#!/usr/bin/env bash
# The human runs this script, never the agent: it blocks on stdin.
set -u

CAPTURED=''

stage() {
	printf '\n=== %s ===\n' "$1"
}

step() {
	printf '  -> %s\n' "$1"
	printf '     press Enter when done: '
	read -r _ack || exit 1
}

capture() {
	printf '  ?  %s: ' "$2"
	IFS= read -r _value || exit 1
	CAPTURED="${CAPTURED}$1=${_value}
"
}

report() {
	printf '\n=== CAPTURED ===\n%s' "$CAPTURED"
}

stage 'Stage 1 - sign in'
step 'Open https://app.example.com in a normal browser window'
step 'Sign in as the tenant that sees the bug'

stage 'Stage 2 - reproduce'
step 'Click Export, wait until the spinner stops'
step 'Open devtools > Network, select the failed request'
capture REQUEST_ID 'paste the x-request-id response header'
capture STATUS_CODE 'type the status code'

report
