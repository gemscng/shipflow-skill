#!/usr/bin/env bash
# ShipFlow loop supervisor for the OpenAI Codex CLI — the always-on equivalent
# of Claude Code's `CronCreate` tick.
#
# Codex has no in-session scheduler, so an interactive `/shipflow-loop` loops
# by sleeping between passes and a closed session ends the loop. This script is
# the outside-the-session form: it runs ONE `codex exec … once` pass per tick
# and sleeps `watch` between ticks, until it is stopped. Run it under
# nohup / tmux / launchd for a reconciler that survives the terminal.
#
# Usage:
#   shipflow-codex-loop                        # a pass every 15m, forever
#   shipflow-codex-loop watch=30m cap=1        # every 30m, one PR per pass
#   shipflow-codex-loop once                   # exactly one pass (codex's exit code)
#   shipflow-codex-loop stop                   # end a running supervisor
#   shipflow-codex-loop --dry-run              # print the codex command, run nothing
#
# Any other token (`cap=1`, `concurrency=1`, `--label bug`, …) is appended to
# the prompt as a /shipflow-loop argument.
#
# Env: CODEX_BIN (codex) · CODEX_HOME (~/.codex) · SHIPFLOW_CODEX_SANDBOX
# (danger-full-access — the loop needs network for gh/git/npm/the API) ·
# SHIPFLOW_LOOP_WATCH (15m) · SHIPFLOW_CODEX_LOOP_DIR ($PWD, passed as -C) ·
# SHIPFLOW_STATE_DIR (~/.shipflow — holds codex-loop.log and codex-loop.stop).
set -euo pipefail

CODEX_BIN="${CODEX_BIN:-codex}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
SANDBOX="${SHIPFLOW_CODEX_SANDBOX:-danger-full-access}"
WATCH="${SHIPFLOW_LOOP_WATCH:-15m}"
DIR="${SHIPFLOW_CODEX_LOOP_DIR:-$PWD}"
STATE_DIR="${SHIPFLOW_STATE_DIR:-$HOME/.shipflow}"

STOP_FILE="$STATE_DIR/codex-loop.stop"
LOG_FILE="$STATE_DIR/codex-loop.log"

ONCE=0
DRY_RUN=0
DO_STOP=0
TOKENS=""

for arg in "$@"; do
  case "$arg" in
    once) ONCE=1 ;;
    stop) DO_STOP=1 ;;
    --dry-run) DRY_RUN=1 ;;
    watch=*) WATCH="${arg#watch=}" ;;
    *) TOKENS="${TOKENS:+$TOKENS }$arg" ;;
  esac
done

log() {
  printf 'shipflow-codex-loop: %s\n' "$1" >&2
  mkdir -p "$STATE_DIR"
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" >> "$LOG_FILE"
}

# watch=<n>s | <n>m | <n>h | bare <n> (seconds) → seconds
parse_duration() {
  local d="$1" n unit
  n="${d%[smh]}"
  unit="${d#"$n"}"
  case "$n" in ''|*[!0-9]*) return 1 ;; esac
  case "$unit" in
    ''|s) echo "$n" ;;
    m) echo $((n * 60)) ;;
    h) echo $((n * 3600)) ;;
    *) return 1 ;;
  esac
}

if ! WATCH_SECS="$(parse_duration "$WATCH")"; then
  echo "shipflow-codex-loop: invalid watch duration '$WATCH' — use <n>s, <n>m, <n>h, or a bare number of seconds" >&2
  exit 1
fi

if [ "$DO_STOP" -eq 1 ]; then
  mkdir -p "$STATE_DIR"
  : > "$STOP_FILE"
  echo "shipflow-codex-loop: stop requested — $STOP_FILE (a running supervisor exits after its current tick)"
  exit 0
fi

# Prompt: the installed /shipflow-loop custom prompt, wherever it landed.
PROMPT_FILE=""
if [ -f "$CODEX_HOME/prompts/shipflow-loop.md" ]; then
  PROMPT_FILE="$CODEX_HOME/prompts/shipflow-loop.md"
else
  # SC2012: the plugin cache path is version-sorted (sort -V) — `ls -d` is the
  # same resolution the skill documents; these paths never contain newlines.
  # shellcheck disable=SC2012
  cached="$(ls -d "$CODEX_HOME"/plugins/cache/shipflow/shipflow/*/codex/prompts/shipflow-loop.md 2>/dev/null | sort -V | tail -1 || true)"
  if [ -n "$cached" ] && [ -f "$cached" ]; then
    PROMPT_FILE="$cached"
  elif [ -f "$HOME/.shipflow-skill/codex/prompts/shipflow-loop.md" ]; then
    PROMPT_FILE="$HOME/.shipflow-skill/codex/prompts/shipflow-loop.md"
  fi
fi
if [ -z "$PROMPT_FILE" ]; then
  echo "shipflow-codex-loop: no shipflow-loop prompt found — run codex/install.sh (or codex plugin add shipflow@shipflow)" >&2
  exit 1
fi

TAIL="once${TOKENS:+ $TOKENS}"

if [ "$DRY_RUN" -eq 1 ]; then
  # One line, readable: the prompt argument is the prompt file plus the tail.
  # SC2016: the `$(cat …)` is literal text being shown, not expanded here.
  # shellcheck disable=SC2016
  printf '%s exec --sandbox %s -C %s "$(cat %s)\\n\\n%s"\n' \
    "$CODEX_BIN" "$SANDBOX" "$DIR" "$PROMPT_FILE" "$TAIL"
  printf 'prompt: %s\n' "$PROMPT_FILE"
  exit 0
fi

trap 'log "interrupted"; exit 130' INT TERM

# The stop file is a request from another invocation (`shipflow-codex-loop
# stop`); consuming it is what ends this supervisor.
check_stop() {
  if [ -e "$STOP_FILE" ]; then
    rm -f "$STOP_FILE"
    log "stopped"
    exit 0
  fi
}

PROMPT="$(cat "$PROMPT_FILE")

$TAIL"

mkdir -p "$STATE_DIR"
tick=0
while :; do
  tick=$((tick + 1))
  log "tick $tick start $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  # A failing tick never stops the supervisor — it is logged and the next tick
  # runs. Only `once` propagates the exit code.
  status=0
  SHIPFLOW_HEADLESS=1 "$CODEX_BIN" exec --sandbox "$SANDBOX" -C "$DIR" "$PROMPT" || status=$?
  log "tick $tick end exit=$status"

  if [ "$ONCE" -eq 1 ]; then
    exit "$status"
  fi

  check_stop

  # Sleep the interval in 30 s slices so a `stop` lands within ~30 s.
  remaining="$WATCH_SECS"
  while [ "$remaining" -gt 0 ]; do
    check_stop
    if [ "$remaining" -lt 30 ]; then slice="$remaining"; else slice=30; fi
    sleep "$slice"
    remaining=$((remaining - slice))
  done
  check_stop
done
