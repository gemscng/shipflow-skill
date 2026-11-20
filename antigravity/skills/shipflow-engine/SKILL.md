---
name: shipflow-engine
description: "Make this machine the org's AI engine — run every ShipFlow workflow's model calls locally (start|stop|status)"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Follow the engine instructions in `../shipflow/references/antigravity.md` for the requested start, stop, or status action.
