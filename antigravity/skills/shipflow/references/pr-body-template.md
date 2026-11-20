<!-- GENERATED from skills/shipflow/references/message-style.md § PR body template. Do not edit. -->
<!-- Regen: node scripts/check-pr-body-template.mjs --write -->

### PR body template

Every PR body, in this order, a blank line between sections. A reviewer
triages on the first screen, so it opens with the outcome and the risk
(#1476). The PR command appends the footer: the project and `Closes #<n>`
(`Part of #<n>` with `--partial`). Never write a `## ShipFlow context`
block or the issue link yourself; write `Fixes #<m>` only for another issue.

| # | Section | Shape |
|---|---|---|
| 1 | `**Outcome:**` | One line: what changes for users |
| 2 | `**Risk:**` | `<tier>: <why>`, the tier and file `pr ready` prints |
| 3 | **Business flow** | `message-style.md` § Business flow: before → after in roles and screens |
| 4 | **Evidence** | Images or links; each shot outlined (`browser-testing.md` § Mark what changed) |
| 5 | **Changed** | Table, area → change |
| 6 | `<details>` | **Root cause** (≤3 bullets, mermaid for a flow), **Testing** (checklist with numbers), file lists |
| 7 | `**How to revert:**` | Usually `git revert <merge sha>`, plus any migration, config or deploy step it does not undo (#1391) |

Bullets ≤12 words, cells ≤15 words; write for about 25 visible lines.
`pr create --lint=strict` exits 2 and opens nothing when the body:

- has no **Business flow** section, or a "no change" line with no reason
- runs over 50 visible lines outside `<details>`
- fails the prose lint (parallel facts written as sentences)
- has a heading that nearly matches `## Deviations from brief`

It also exits 2 when the branch changes a visible surface and no issue is
linked. The `💡 readability:` lines (Outcome first, Risk within 8 lines,
word caps) never block.
