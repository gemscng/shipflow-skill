---
name: shipflow-status
description: "Show your ShipFlow project status"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Run `renaiss-shipflow status --json`, parse the JSON (do not regex-scrape), and summarize what's on the user's plate.

Render it graphical-first — the reader judges it in one glance, not by reading prose:

1. One verdict line: overall state + a progress meter, e.g. `▰▰▰▱▱ 3/5 in flight — 1 blocked`.
2. A table, one row per item: `| Ref | Title | State | Next action |`. Emoji-code
   the state (✅ done · 🔵 in progress · 🚧 blocked/needs-human · ⬜ todo).
3. At most 3 bullets for anything a table can't carry (≤12 words each). No paragraphs.
