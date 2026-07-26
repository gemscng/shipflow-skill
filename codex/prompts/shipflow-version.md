---
description: Show ShipFlow versions — installed skill/plugin, CLI, and server build
---

Report every ShipFlow component version in one table:

```bash
renaiss-shipflow version
```

- The `server` row is the deployed build's git revision (public
  `GET /api/v1/version`) — compare it against `origin/main` to tell whether the
  latest merge is actually serving.
- The `npm latest` row is the registry's `latest` dist-tag and the **drift**
  verdict for the running binary (`current` / `stale` / `ahead` / `unknown`).
  The registry — never the working tree — is the reference: a checkout's
  `package.json` is whatever branch is checked out, so a tree comparison reports
  healthy during real drift.
- `plugin/skill` and `cli` are lockstep-versioned: a mismatch means one lags.
  **Fix it per `channel`** (shown beside the `cli` row): `npm-global` →
  `npm i -g @renaiss-shipflow/cli@<exact latest>` (never a bare `@latest` — npm
  serves dist-tags from a 300s cache on install); `plugin-launcher` →
  `/shipflow-update`. Only the plugin-launcher channel self-updates; an
  npm-global install tracks nothing.
- After upgrading, **re-read `renaiss-shipflow --version` and compare the
  string** — `npm i -g` exits 0 even when it changed nothing.
- `renaiss-shipflow version --check` is the same probe as an exit code (**9** =
  the running CLI is behind, 0 = anything else) for scripts and CI.
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
