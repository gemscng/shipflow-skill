---
description: Show your ShipFlow project status
---

Run `renaiss-shipflow status --json`, parse the JSON (do not regex-scrape), and summarize what's on the user's plate.

Render it graphical-first — the reader judges it in one glance, not by reading prose:

1. One verdict line: overall state + a progress meter, e.g. `▰▰▰▱▱ 3/5 in flight — 1 blocked`.
2. A table, one row per item: `| Ref | Title | State | Next action |`. Emoji-code
   the state (✅ done · 🔵 in progress · 🚧 blocked/needs-human · ⬜ todo).
3. At most 3 bullets for anything a table can't carry (≤12 words each). No paragraphs.
