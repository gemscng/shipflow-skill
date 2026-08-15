---
description: File a new ShipFlow issue
argument-hint: <title / description>
---

Create a ShipFlow issue with `renaiss-shipflow issue create --title "..." --body "..."`, deriving the title and body from: $ARGUMENTS. Note: creating an issue does not claim it.

**Who it lands on (#673).** Under `pickup-scope=assigned` (the default) the
filing is **auto-assigned to the current gh login** — assignment is the
queueing gesture (#600), so an unassigned issue is invisible to `issue next`.
On a shared account that means the loop can pick it up.

| The user wants | Flag |
|---|---|
| The loop to work it (default) | none — it is assigned automatically |
| A backlog item **no agent should claim yet** | `--no-assign` |
| A specific person on it | `--assignee <login>` (`@me` = the gh login) |

`--no-assign` and `--assignee` are mutually exclusive. The command prints
`— assigned to @<login>` beside the URL, so say who it landed on.

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

**Exit 12 means duplicate, not failure.** `issue create` runs a duplicate
pre-flight over every open issue and refuses a **near-verbatim restatement**,
creating nothing (issue #580). On exit 12:

| What it printed | What you do |
|---|---|
| `⛔ … #N <title> (0.88)` + `--allow-duplicate` | Report the match and offer `renaiss-shipflow issue work N` |
| Same, but the work is genuinely a different defect | Re-run with `--allow-duplicate` and say why in the body |
| `--json` / `--yaml` caller | Read `{blocked: true, candidates: […]}` from stdout |

Never report the issue as unfiled without surfacing the candidates, and never
read 12 as "the command broke". A **clean exit 0 is not proof there is no
duplicate** either — the guard catches restatements, not paraphrases.

A screenshot is worth more than prose: when the report describes something visible (a broken layout, a wrong render, an error dialog) and a screenshot or recording file is available — or you can capture one with the browser tools — attach it with `--screenshot <path...>` (repeatable; add `--screenshot-caption "<what this shot shows>"` per shot, by position). The files are hosted and embedded in the issue body — reference them from the evidence table. If the upload fails the issue is NOT created — retry, or create without `--screenshot` and attach via `issue evidence --image` afterwards.
