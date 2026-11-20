---
name: shipflow-inbox
description: "Show open PRs (review feedback / failing CI) and in-progress issues (new comments) needing follow-up"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Run `renaiss-shipflow inbox --json` and report what needs follow-up before new work:
- PRs where `needsAttention` is true (reasons: `changes_requested`, `ci_failing`, `review_comments`).
- In-progress issues with a `newComment` (someone replied and you may owe a response).

Render it graphical-first — a table the reader triages in one glance, not prose:

1. One verdict line: `🔴 2 need attention · 💬 1 awaiting reply` (or `✅ inbox clear`).
2. A table, one row per flagged item: `| Ref | Why flagged | Next action |`. Emoji-code
   the reason (🔴 changes_requested · ❌ ci_failing · 💬 review_comments/newComment).
3. No paragraphs; anything else is ≤3 bullets, ≤12 words each.

For anything flagged, offer to address it (read the PR/issue, fix, push, reply).
