---
description: File a new ShipFlow issue
argument-hint: <title / description>
---

Create a ShipFlow issue with `renaiss-shipflow issue create --title "..." --body "..."`, deriving the title and body from: $ARGUMENTS. Note: creating an issue does not claim it.

Derive the body per the **issue-body ladder** (authoritative copy:
`skills/shipflow/references/loop-mode.md` § "Message style"; live demo: issue #387) — graphical-first, top-down:

1. **Status header** — first line, one blockquote: `> <🔴P0|🟠P1|🟡P2|🟢P3> **P<n> · <type> · <area> · effort <S/M/L>** · hand-filed`
2. **Core** — bug: `**Repro**` numbered steps + `**Expected**` / `**Actual**` / `**Impact** … · severity:<level>` one-liners; feature/task: **Why** + **What**, ≤3 bullets each
3. **Mermaid** — only when the defect/design has a flow, sequence, or state shape
4. **Evidence table** — `| Claim | Where |` for every `file:line` claim or screenshot
5. **Acceptance checklist** — always; `- [ ]` items the reviewer gates on
6. **`<details>`** — fold long logs / alt options

Compact example body:

```
> 🟡 **P2 · bug · ux · effort S** · hand-filed

**Repro**
1. Open /settings
2. Click Save with an empty name

**Expected** inline validation error

**Actual** silent 500; form clears

**Impact** settings unsavable · severity:medium

| Evidence | Where |
|---|---|
| Handler skips validation | `api/settings.ts:42` |

- [ ] Empty name shows inline error; no 500
```

A screenshot is worth more than prose: when the report describes something visible (a broken layout, a wrong render, an error dialog) and a screenshot or recording file is available — or you can capture one with the browser tools — attach it with `--screenshot <path...>` (repeatable; add `--screenshot-caption "<what this shot shows>"` per shot, by position). The files are hosted and embedded in the issue body — reference them from the evidence table. If the upload fails the issue is NOT created — retry, or create without `--screenshot` and attach via `issue evidence --image` afterwards.
