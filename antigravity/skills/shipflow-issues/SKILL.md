---
name: shipflow-issues
description: "List open ShipFlow issues"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Run `renaiss-shipflow issues list --json` and present the open issues graphical-first:

1. One verdict line with counts, e.g. `12 open — 🔴 2 critical · 🚧 1 needs-human`.
2. A table, one row per issue: `| # | Title | Priority | Labels |`. Emoji-code
   priority (🔴 critical · 🟠 high · 🟡 medium · 🔵 low).
3. No paragraphs.
