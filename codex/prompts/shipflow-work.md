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

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-work.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
