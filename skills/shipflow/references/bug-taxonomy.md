# Bug taxonomy + QA checklist

The loop's shared vocabulary: the **reviewer** classifies findings with it,
the **bug sweep** (Phase C) labels filed issues with it, and the severity
scale defines `issue next`'s `priority → severity → newest` ordering.

## Contents

1. **Severity** · 2. **Categories** · 3. **Labels** · 4. **Per-page QA
checklist**

## 1. Severity (drives `issue next` ordering)

| Severity | Definition | Examples |
|---|---|---|
| **critical** | Blocks a core workflow, loses data, or crashes the app | submit → error page, checkout broken, delete with no confirm |
| **high** | Major feature broken/unusable, no workaround | search returns wrong results, upload silently fails, auth redirect loop |
| **medium** | Works but with a noticeable problem; a workaround exists | >5s load, validation missing but submit still works, mobile-only layout break |
| **low** | Cosmetic / polish | footer typo, 1px misalignment, inconsistent hover |

The loop fixes by tier: **critical + high** always; **medium** unless capped
out; **low** only when the queue is otherwise empty. A reviewer may not
`approve` a PR that leaves a **critical/high** finding from its own brief
unaddressed.

## 2. Categories

1. **visual** — layout breaks, clipped/overlapping text, broken images, z-index, theme/dark-mode, alignment
2. **functional** — broken links, dead buttons, validation missing/bypassed, wrong redirects, state lost on refresh/back, double-submit, search wrong
3. **ux** — confusing nav / dead ends, no loading indicator, slow (>500ms) with no feedback, "Something went wrong" with no detail, no confirm before destructive action
4. **content** — typos, outdated text, leftover lorem ipsum, truncation, wrong labels, unhelpful empty states
5. **performance** — >3s loads, janky scroll, layout shift, >50 requests/page, unoptimized images, blocking JS
6. **console** — uncaught JS exceptions, failed 4xx/5xx requests, deprecation warnings, CORS, mixed-content, CSP violations
7. **accessibility** — missing alt text, unlabeled inputs, broken keyboard nav, focus traps, bad ARIA, low contrast

## 3. Labels on a filed issue

Every sweep-filed bug carries its classification as labels:

```bash
renaiss-shipflow issue create --title "<bug>" --body "<body — see shape below>" \
  --label bug --label auto-qa \
  --label "severity:<critical|high|medium|low>" \
  --label "area:<visual|functional|ux|content|performance|console|accessibility>" --json
```

The reviewer uses the same severity words in its verdict bullets
(`[critical|high|med]`).

The body follows the **issue-body ladder** (`loop-mode.md` § "Message style" —
the one authoritative copy). Sweep-filed bug shape: status-header blockquote
(`> 🟡 **P2 · bug · <area> · effort S** · auto-qa sweep`), **Repro** steps,
**Expected**/**Actual**/**Impact** one-liners (Impact carries
`severity:<level>`), an `| Evidence | Where |` table (claim → path:line /
screenshot), and an acceptance checkbox
(`- [ ] <actual> no longer occurs; <expected> observed`). Mermaid only for
flow/sequence/state-shaped defects; long logs in `<details>`; blank lines are
load-bearing (GitHub collapses single newlines).

## 4. Per-page QA checklist (the bug sweep's method)

Run on every page the sweep visits — systematic, not ad-hoc:

1. **Visual scan** — annotated screenshot (`snapshot -i -a -o`); layout/image/alignment breaks
2. **Interactive elements** — click every button, link, control; each does what it says?
3. **Forms** — fill + submit; empty, invalid, and edge data (long text, special chars)
4. **Navigation** — paths in/out: breadcrumbs, back button, deep links, mobile menu
5. **States** — empty, loading, error, full/overflow
6. **Console** — `console --errors` after interactions; new JS errors or failed requests?
7. **Responsiveness** — mobile + tablet viewports where relevant (`viewport 375x812`)
8. **Auth boundaries** — logged-out behavior; different roles

File a finding only when **reproduced** (retry once to rule out a fluke),
classified with a severity + category from §1–2, and not already an open
issue. Depth over breadth: 5–10 well-evidenced bugs beat 20 vague ones.
