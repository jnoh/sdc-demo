#!/bin/bash
# sdc.sh — Self-Driving Codebase wrapper
# Run once. Loops Claude Code sessions until all tasks complete.
# Handles lead context exhaustion, crashes, and interrupts gracefully.

set -euo pipefail

# Initialize logging
mkdir -p .sdc/logs
RUN_LOG=".sdc/logs/run-$(date -u +%Y%m%d-%H%M%S).log"
ln -sf "$(basename "$RUN_LOG")" .sdc/logs/run-latest.log
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [sdc.sh] session-start" >> "$RUN_LOG"

MAX_RETRIES=20
retry=0
launched_once=false

while true; do
  # Check for remaining open issues
  open=$(gh issue list --label "sdc" --state open --json number 2>/dev/null | jq 'length' 2>/dev/null || echo "-1")

  if [ "$open" = "-1" ]; then
    echo "Warning: Could not check GitHub issues. Launching lead session anyway..."
  elif [ "$open" -eq 0 ] && [ "$launched_once" = true ]; then
    # Only exit after we've launched the lead at least once
    # This ensures new spec requirements get picked up even when all old issues are closed
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [sdc.sh] all-tasks-complete" >> .sdc/logs/run-latest.log
    echo "All tasks complete."
    break
  elif [ "$open" -eq 0 ]; then
    echo "Launching lead to check for new work..."
  else
    echo "$open task(s) remaining."
  fi

  retry=$((retry + 1))
  if [ "$retry" -gt "$MAX_RETRIES" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [sdc.sh] max-retries-reached retries=$MAX_RETRIES" >> .sdc/logs/run-latest.log
    echo "Max retries ($MAX_RETRIES) reached. Exiting."
    exit 1
  fi

  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [sdc.sh] launching-lead retry=$retry" >> .sdc/logs/run-latest.log
  echo "Launching lead session (attempt $retry/$MAX_RETRIES)..."

  # Launch Claude Code with the self-drive skill
  # Exit code 0 = clean exit, non-zero = crash/interrupt
  exit_code=0
  claude -p "/self-drive" || exit_code=$?
  launched_once=true
  if [ "$exit_code" -ne 0 ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [sdc.sh] lead-crashed exit=$exit_code" >> .sdc/logs/run-latest.log
    echo "Lead session exited with code $exit_code. Restarting in 5 seconds..."
    sleep 5
  fi
done

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [sdc.sh] session-end" >> .sdc/logs/run-latest.log
echo "Self-driving run complete. Check .sdc/logs/run-latest.log for details."
