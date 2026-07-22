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
  --before-caption "what surface 1 shows before" "what surface 2 shows before" \
  --after-caption  "what surface 1 shows after"  "what surface 2 shows after" \
  --caption "one-line summary of what was verified"
```

- `before[i]` pairs with `after[i]`; `--label` names each pair by position.
- Multiple (or labeled) pairs render as a side-by-side `| Surface | 🔴 Before | 🟢 After |`
  table; a single unlabeled pair renders under stacked Before/After headings.
- `--before-caption`/`--after-caption` describe each shot **by position** and render
  directly under that image, so a shot can't be mislabeled by a blanket summary. Pass
  one per screenshot; skip a shot with an empty string. `--caption` stays the optional
  one-line summary. (`--image-caption` captions supplementary `--image`/`--file` items.)
- **One claim per image**: a caption asserts only what its own image shows — if it
  needs "and" or lists surfaces/viewports, split into more labeled pairs.
- **Mark the change without covering it**: before each after-shot, outline the changed
  element (`outline: 3px solid #ff3b30; outline-offset: 3px` via your browser tool's
  JS eval) — the outline surrounds the change; never overlay content with boxes/arrows.
- `--file` is only for supplementary media (a screen recording); `--pr` lands the
  comment on the PR for reviewers. The reporter's chat thread is pinged either way.
- Capture flow (headed browser, per-surface loop): `references/browser-testing.md` §4.
