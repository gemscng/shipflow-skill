---
description: Pick & claim the next ShipFlow issue (priority-ordered)
---

Run `renaiss-shipflow issue next --json` to claim the next open, unclaimed issue (ordered priority → severity → newest). Exit code 4 / `issue: null` means nothing actionable remains.

Present the claim graphical-first (keep the triage substance verbatim — reshape, don't reword):

1. One verdict line: `Claimed #N — <title>`.
2. Facts table: `| Priority | Severity | Labels | Features |`.
3. Triage `relatedFiles` as a `- [ ]` checklist; `relatedCommits` as short lines.
4. The issue body as-is below.
