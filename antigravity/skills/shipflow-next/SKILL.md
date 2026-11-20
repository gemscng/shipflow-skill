---
name: shipflow-next
description: "Pick & claim the next ShipFlow issue (priority-ordered)"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Run `renaiss-shipflow issue next --json` to claim the next open, unclaimed issue (ordered priority → severity → newest). Exit code 4 / `issue: null` means nothing actionable remains.

Present the claim graphical-first (keep the triage substance verbatim — reshape, don't reword):

1. One verdict line: `Claimed #N — <title>`.
2. Facts table: `| Priority | Severity | Labels | Features |`.
3. Triage `relatedFiles` as a `- [ ]` checklist; `relatedCommits` as short lines.
4. The issue body as-is below.

When the fix is done, open the PR (`/shipflow-pr`), then attach evidence of the fix (`/shipflow-evidence`): before/after screenshots for a visible change, the test summary otherwise. `/shipflow-pr` prints the exact `issue evidence` command (#1487).
