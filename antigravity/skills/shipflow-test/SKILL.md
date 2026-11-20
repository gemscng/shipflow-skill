---
name: shipflow-test
description: "Run the project's tests via ShipFlow"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Run `renaiss-shipflow test` and report the results graphical-first:

1. One verdict line: `✅ pass` / `🔴 fail` + a pass-rate meter `▰▰▰▰▱ 8/10`.
2. Failures (if any) as a table: `| Test | Error |` — most actionable first.
3. No prose paragraphs.
