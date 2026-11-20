---
name: shipflow-done
description: "Release a claimed ShipFlow issue"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Release the issue with `renaiss-shipflow issue done <number> --reason "..."`. Arguments (number then optional reason): $ARGUMENTS
