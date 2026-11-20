---
name: shipflow-version
description: "Show ShipFlow versions — installed skill/plugin, CLI, and server build"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

For the local CLI version, run the bundled CLI with `--version`. For the full version report, run `version --json` and include the installed plugin version from `../../plugin.json` relative to this skill directory.
