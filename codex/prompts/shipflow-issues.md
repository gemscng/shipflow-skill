---
description: List open ShipFlow issues
---

Run `renaiss-shipflow issues list --json` and present the open issues graphical-first:

1. One verdict line with counts, e.g. `12 open — 🔴 2 critical · 🚧 1 needs-human`.
2. A table, one row per issue: `| # | Title | Priority | Labels |`. Emoji-code
   priority (🔴 critical · 🟠 high · 🟡 medium · 🔵 low).
3. No paragraphs.

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-issues.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
