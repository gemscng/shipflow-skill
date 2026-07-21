---
description: Cut a ShipFlow release (confirms first)
argument-hint: vX.Y.Z
---

Cut a release with `renaiss-shipflow release --tag $1 --json` — but ONLY after explicit user confirmation; releases trigger downstream workflows visible to the whole team.

Before asking, show what the user is confirming as a checklist they judge in one glance:

- [ ] tag `$1` and the commit it lands on
- [ ] branch is the release base and CI is green
- [ ] downstream workflows this triggers (patch notes, regression, notifications)

THEN ask to confirm. No prose paragraphs.
