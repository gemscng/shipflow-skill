---
description: Merge a ShipFlow PR (confirms first)
argument-hint: <pr-number>
---

Merge PR #$1 with `renaiss-shipflow pr merge $1` — but ONLY after explicit user confirmation, since it triggers team-visible downstream workflows.

Before asking, show what the user is confirming — run `renaiss-shipflow pr ready $1 --json` and render:

1. Verdict line: `✅ ready` / `⏸️ not ready` + `| PR | CI | Approved | Threads | Policy | Risk |` one-row table (Risk = `riskReason`, e.g. `high: .github/workflows/ci.yml`).
2. Any blockers as an unchecked list (`- [ ] <blocker>`).
3. THEN ask to confirm. Never merge with open blockers unless the user insists.

`pr merge` merges at any risk tier, because the person confirming is the human approval a medium or high PR asks for. When a blocker says the PR still needs a human or maintainer approval, say so in the question: confirming means the user takes that review on.
