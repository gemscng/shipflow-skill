<!-- GENERATED from skills/shipflow/references/message-style.md § Issue-body ladder. Do not edit. -->
<!-- Regen: node scripts/check-issue-body-ladder.mjs --write -->

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
