---
name: shipflow-release
description: "Cut a ShipFlow release (confirms first)"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Cut a release with `renaiss-shipflow release --tag $1 --json` — but ONLY after explicit user confirmation; releases trigger downstream workflows visible to the whole team.

Before asking, show what the user is confirming as a checklist they judge in one glance:

- [ ] tag `$1` and the commit it lands on
- [ ] branch is the release base and CI is green
- [ ] downstream workflows this triggers (patch notes, regression, notifications)

THEN ask to confirm. No prose paragraphs.
