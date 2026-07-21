---
description: Attach test evidence (screenshot/video) to a ShipFlow issue
argument-hint: <issue-number> [files…]
---

Attach testing evidence for issue $ARGUMENTS — screenshots must show the fix's
effect as **before/after pairs, one per changed surface** (not one pair total):

```bash
renaiss-shipflow issue evidence <number> [--pr <pr>] \
  --before <surface1-before.png> <surface2-before.png> \
  --after  <surface1-after.png>  <surface2-after.png> \
  --label  "Surface 1" "Surface 2" \
  --caption "what was verified"
```

- `before[i]` pairs with `after[i]`; `--label` names each pair by position.
- Multiple (or labeled) pairs render as a side-by-side `| Surface | 🔴 Before | 🟢 After |`
  table; a single unlabeled pair renders under stacked Before/After headings.
- `--file` is only for supplementary media (a screen recording); `--pr` lands the
  comment on the PR for reviewers. The reporter's chat thread is pinged either way.
- Capture flow (headed browser, per-surface loop): `references/browser-testing.md` §4.

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-evidence.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
