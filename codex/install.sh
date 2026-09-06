#!/usr/bin/env bash
# ShipFlow for OpenAI Codex CLI — install (or refresh) everything Codex needs:
#
#   1. the bundled `renaiss-shipflow` CLI on PATH      → $SHIPFLOW_BIN_DIR/renaiss-shipflow
#   2. the /shipflow-* custom prompts                  → $CODEX_HOME/prompts/shipflow-*.md
#   3. the `shipflow` + `smart-commit` skills          → $CODEX_HOME/skills/<name>
#      (skipped when run from an installed Codex plugin, which serves them itself)
#
# After this, `$shipflow` (and `$smart-commit`) invoke the skills in Codex, and
# Codex also auto-selects `shipflow` from its description when you mention
# ShipFlow. Skills are SYMLINKED into this checkout by default so a plain
# `git pull` in the clone refreshes them — no re-install step. Set
# SHIPFLOW_CODEX_LINK=copy to copy instead (e.g. a throwaway checkout).
#
# Re-running is safe: it re-points the CLI link, refreshes the prompts, and
# replaces a previous ShipFlow install of each skill. It never touches a skill
# directory whose SKILL.md names a different skill.
#
# Env overrides: CODEX_HOME (default ~/.codex) · SHIPFLOW_BIN_DIR (default
# ~/.local/bin) · SHIPFLOW_SKILL_DIR (default: the checkout this script lives in).
set -euo pipefail

ROOT="${SHIPFLOW_SKILL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
BIN_DIR="${SHIPFLOW_BIN_DIR:-$HOME/.local/bin}"
MODE="${SHIPFLOW_CODEX_LINK:-symlink}"
SKILLS="shipflow smart-commit"

case "$MODE" in symlink|copy) ;; *) echo "install.sh: SHIPFLOW_CODEX_LINK must be 'symlink' or 'copy' (got: $MODE)" >&2; exit 2 ;; esac
for s in $SKILLS; do
  [ -f "$ROOT/skills/$s/SKILL.md" ] || { echo "install.sh: $ROOT/skills/$s/SKILL.md not found — is $ROOT a shipflow-skill checkout?" >&2; exit 1; }
done
[ -x "$ROOT/bin/renaiss-shipflow" ] || { echo "install.sh: $ROOT/bin/renaiss-shipflow missing or not executable" >&2; exit 1; }

# The `name:` a SKILL.md declares — the only thing we trust when deciding
# whether an existing skill directory is ours to replace.
skill_name_of() {
  sed -n '1,/^---$/{s/^name:[[:space:]]*//p;}' "$1/SKILL.md" 2>/dev/null | tail -1 | tr -d '\r"'"'"
}

# 1. CLI on PATH
mkdir -p "$BIN_DIR"
ln -sfn "$ROOT/bin/renaiss-shipflow" "$BIN_DIR/renaiss-shipflow"
echo "cli:     $BIN_DIR/renaiss-shipflow -> $ROOT/bin/renaiss-shipflow"
case ":$PATH:" in *":$BIN_DIR:"*) ;; *) echo "         note: $BIN_DIR is not on PATH — add it to your shell profile" ;; esac

# 2. Custom prompts (/shipflow-*)
mkdir -p "$CODEX_HOME/prompts"
n=0
for f in "$ROOT"/codex/prompts/shipflow-*.md; do
  [ -f "$f" ] || continue
  cp "$f" "$CODEX_HOME/prompts/$(basename "$f")"
  n=$((n + 1))
done
echo "prompts: $n /shipflow-* prompt(s) -> $CODEX_HOME/prompts"

# 3. Skills ($shipflow, $smart-commit). When this checkout IS the installed
# Codex plugin (codex plugin add shipflow@shipflow copies the repo under
# $CODEX_HOME/plugins/cache/), the plugin already serves both skills — linking
# them again would make Codex list each skill twice.
case "$ROOT" in
  "$CODEX_HOME"/plugins/*)
    echo "skills:  served by the installed Codex plugin ($ROOT) — not linked into $CODEX_HOME/skills"
    SKILLS=""
    ;;
esac
mkdir -p "$CODEX_HOME/skills"
for s in $SKILLS; do
  src="$ROOT/skills/$s"
  dst="$CODEX_HOME/skills/$s"
  if [ -L "$dst" ]; then
    rm -f "$dst"
  elif [ -e "$dst" ]; then
    existing="$(skill_name_of "$dst")"
    if [ "$existing" != "$s" ]; then
      echo "install.sh: $dst exists and is not a ShipFlow '$s' skill (SKILL.md name: '${existing:-none}') — move it aside and re-run" >&2
      exit 1
    fi
    rm -rf "$dst"
  fi
  if [ "$MODE" = symlink ] && ln -s "$src" "$dst" 2>/dev/null; then
    echo "skill:   \$$s -> $dst -> $src (symlink)"
  else
    cp -R "$src" "$dst"
    echo "skill:   \$$s -> $dst (copy)"
  fi
done

cat <<MSG

ShipFlow is installed for Codex. Next:
  renaiss-shipflow login          # once per machine (rides on gh auth)
  codex                           # then type: \$shipflow  (or /shipflow-status, /shipflow-loop, ...)
Update: git -C "$ROOT" pull --ff-only   # skills refresh with the checkout; re-run this script for new prompts
MSG
