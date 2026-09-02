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
`skills/shipflow/references/message-style.md`; live demos: issue #387 bug shape, #712 feature/task shape) — graphical-first, top-down:

### Issue-body ladder — every ShipFlow-filed issue body

**Authoritative for EVERY issue body ShipFlow files** — loop bug-sweep /
auto-qa issues, Phase-B follow-up sub-issues, feature-relate auto-issues,
harvest-filed issues, hand-filed `/shipflow-new-issue`. Issue #387 is the
live demo. Build top-down:

**Title first** — the one line every reader sees in a list (#969; measured
on renaiss-os-index: 27 of 60 titles ran past 70 chars, 22 opened with a
`[area]` prefix that duplicated a label). ≤60 chars, the user-visible
outcome first (`Card page shows USD before the profile currency`), area on
a label never a `[area]` prefix, no trailing period, never a bare path or
identifier. `issue create` warns (and returns the list as `lint` under
`--json`); the loop fixes the text before filing, never after a reader saw it.

| # | Element | When | Shape |
|---|---|---|---|
| 1 | **Status header** | always — the first line (the loop's Judge block, when present, sits above it — #969) | one blockquote line: `> <priority emoji> **P<n> · <type> · <area> · effort <S/M/L>** · <wave/source>` |
| 2 | **Body core** | always | bug → the Repro core below; feature/task → the Why/What/Example core below |
| 3 | **Mermaid diagram** | the defect or design branches, races, or spans ≥3 interacting components — never for a linear restatement of one line | small `flowchart`/`sequenceDiagram`/`stateDiagram` — beats prose causality when the SHAPE is the point |
| 4 | **Evidence table** | any `file:line` claim | `\| Claim \| Where \|` — every claim grounded in `path:line` / links / screenshots; a claim about a change adds Before / After columns (#960) |
| 5 | **Acceptance checklist** | always | `- [ ]` items — the reviewer's coverage gate checks them 1:1 |
| 6 | **`<details>` folds** | long logs, alt options, raw data | collapsed at the bottom, never unfolded |

Priority emoji: 🔴 P0 · 🟠 P1 · 🟡 P2 · 🟢 P3. Wave/source examples:
`auto-qa sweep`, `Part of #N`, `wave 3`, `hand-filed`. All general rules
above apply (≤30 words per cell, blank line between sections, prose
last).

**Bug-body core** — element 2's shape (blank lines are load-bearing):

```
**Repro**
1. <step>
2. <step>

**Expected** <one line>

**Actual** <one line>

**Impact** <one line> · severity:<level>
```

Screenshots/links land in the evidence table (element 4); the acceptance
checklist (element 5) still closes a bug body — minimally
`- [ ] <actual> no longer occurs; <expected> observed`.

**Feature/task-body core** — element 2's shape for non-bugs (blank lines
are load-bearing):

```
**Why**
- <≤3 bullets>

**What**
- <≤3 bullets>

**Example**
<one concrete scenario with real values — a command, input, or user action>

**Expected result**
<the observable outcome once this lands — output, log line, UI state>
```

**Example** and **Expected result** are REQUIRED, not decoration: a
reader must be able to act without a clarifying question, and the
reviewer's spec-coverage gate checks the diff against the stated outcome.
A bug body already carries the pair as **Expected** / **Actual** — never
duplicate them there. Issue #712 is the live demo of the non-bug shape.

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

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-new-issue.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
