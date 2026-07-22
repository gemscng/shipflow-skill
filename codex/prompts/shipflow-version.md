---
description: Show ShipFlow versions — installed skill/plugin, CLI, and server build
---

Report all three ShipFlow component versions in one table:

```bash
renaiss-shipflow version
```

- The `server` row is the deployed build's git revision (public
  `GET /api/v1/version`) — compare it against `origin/main` to tell whether the
  latest merge is actually serving.
- `plugin/skill` and `cli` are lockstep-versioned: a mismatch means one lags —
  run `/shipflow-update` (plugin) or let the bundled CLI self-update.
- If the `renaiss-shipflow` binary is missing or predates the `version` verb,
  fall back to reading the pieces directly:

```bash
PLUGIN_DIR=$(ls -d ~/.claude/plugins/cache/renaissshipflow/shipflow/*/ 2>/dev/null | sort -V | tail -1)
echo "plugin: $(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$PLUGIN_DIR/.claude-plugin/plugin.json" 2>/dev/null | head -1)"
echo "cli: $(renaiss-shipflow --version 2>/dev/null || echo unknown)"
echo "server: $(curl -fsSL --max-time 8 "${SHIPFLOW_API_URL:-https://renaiss-shipflow-api.zeabur.app}/api/v1/version" 2>/dev/null || echo unreachable)"
```

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-version.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
