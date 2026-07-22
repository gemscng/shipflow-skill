---
description: Check for and install ShipFlow plugin updates now
---

Force a ShipFlow plugin update check and install if newer. Never trust a silent
probe — confirm against the live published version before claiming "latest":

```bash
PLUGIN_DIR=$(ls -d ~/.claude/plugins/cache/renaissshipflow/shipflow/*/ 2>/dev/null | sort -V | tail -1)
INSTALLED=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$PLUGIN_DIR/.claude-plugin/plugin.json" 2>/dev/null | head -1 | sed 's/.*"\([0-9][^"]*\)".*/\1/')
PROBE=$([ -n "$PLUGIN_DIR" ] && "$PLUGIN_DIR/bin/shipflow-update-check" --force)
PUBLISHED=$(curl -fsSL --max-time 8 https://renaiss-shipflow.zeabur.app/claude-plugin/marketplace.json 2>/dev/null | grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([0-9][^"]*\)".*/\1/')
echo "installed: ${INSTALLED:-none} | probe: ${PROBE:-silent} | published: ${PUBLISHED:-unreachable}"
```

Decide from those three values:

- **Update** when ANY of these hold — the probe printed `UPGRADE_AVAILABLE`, the
  published version differs from the installed one, the probe printed
  `UPDATE_CHECK_UNKNOWN`, or the published version is unreachable (an
  unverifiable state is treated as possibly-stale, never as current):
  run `claude plugin marketplace update renaissshipflow` then
  `claude plugin update shipflow@renaissshipflow`, then tell the user to run
  **`/reload-plugins`** to apply it in-session (or it loads on next restart).
  The bundled CLI updates live; the reload is only for new/changed slash
  commands and skill files. The assistant cannot run `/reload-plugins` itself —
  it's a manual command.
- Claim "you're on the latest version" ONLY when the published version was
  actually fetched and equals the installed one.

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-update.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
