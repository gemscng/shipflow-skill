---
description: Check for and install ShipFlow plugin updates now
---

Force a ShipFlow plugin update check and install if newer:

```bash
PLUGIN_DIR=$(ls -d ~/.claude/plugins/cache/renaissshipflow/shipflow/*/ 2>/dev/null | sort -V | tail -1)
[ -n "$PLUGIN_DIR" ] && "$PLUGIN_DIR/bin/shipflow-update-check" --force || echo "ShipFlow plugin not found in the plugin cache."
```

- If it prints `UPGRADE_AVAILABLE <old> <new>`: run `claude plugin marketplace update renaissshipflow` then `claude plugin update shipflow@renaissshipflow`, then tell the user to run **`/reload-plugins`** to apply it in-session (or it loads on next restart). The bundled CLI updates live; the reload is only for new/changed slash commands and skill files. The assistant cannot run `/reload-plugins` itself — it's a manual command.
- If it prints nothing: tell the user they're on the latest version.

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-update.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
