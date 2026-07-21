---
description: Merge a ShipFlow PR (confirms first)
argument-hint: <pr-number>
---

Merge PR #$1 with `renaiss-shipflow pr merge $1` — but ONLY after explicit user confirmation, since it triggers team-visible downstream workflows.

Before asking, show what the user is confirming — run `renaiss-shipflow pr ready $1 --json` and render:

1. Verdict line: `✅ ready` / `⏸️ not ready` + `| PR | CI | Approved | Threads | Policy |` one-row table.
2. Any blockers as an unchecked list (`- [ ] <blocker>`).
3. THEN ask to confirm. Never merge with open blockers unless the user insists.
