---
name: shipflow-regression
description: "Trigger ShipFlow regression tests"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Run `renaiss-shipflow regression --json` and report what was triggered graphical-first:

1. One verdict line: `🚀 triggered <n> suite(s)` (or why not).
2. A table of what runs: `| Suite/Feature | Type | Priority |`.
3. No prose paragraphs.
