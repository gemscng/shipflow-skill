---
description: Claim and pick up a specific ShipFlow issue
argument-hint: <issue-number>
---

Claim issue #$1 with `renaiss-shipflow issue work $1 --json`. Do NOT auto-branch or auto-write files — show the context and ask how to proceed.

Present the claim graphical-first (keep the triage substance verbatim — reshape, don't reword):

1. One verdict line: `Claimed #$1 — <title>`.
2. Facts table: `| Priority | Severity | Labels | Features |`.
3. Triage `relatedFiles` as a `- [ ]` checklist; `relatedCommits` as short lines.
4. The issue body as-is below.

When the fix is done, open the PR (`/shipflow-pr`), then attach evidence of the fix (`/shipflow-evidence`): before/after screenshots for a visible change, the test summary otherwise. `/shipflow-pr` prints the exact `issue evidence` command (#1487).
