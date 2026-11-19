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
| 2 | **Body core** | always | bug → the Business flow + Repro core below; feature/task → the Why/Business flow/What/Example core below (`message-style.md` § Business flow, #1493) |
| 3 | **Picture** | any body over 120 visible words (#1491) — `issue create --lint=strict` files nothing without one | the first fitting row of the Picture table below, right under the body core |
| 4 | **Evidence table** | any `file:line` claim | `\| Claim \| Where \|` — every claim grounded in `path:line` / links / screenshots; a claim about a change adds Before / After columns (#960) |
| 5 | **Acceptance checklist** | always | `- [ ]` items — the reviewer's coverage gate checks them 1:1 |
| 6 | **Deferred** | parent of a partial slice — remaining parts that failed the spin-off gate | `- [ ]` checklist on the parent; later promotion keeps `Part of #<n>` provenance |
| 7 | **`<details>` folds** | long logs, alt options, raw data | collapsed at the bottom, never unfolded |

Priority emoji: 🔴 P0 · 🟠 P1 · 🟡 P2 · 🟢 P3. Wave/source examples:
`auto-qa sweep`, `Part of #N`, `wave 3`, `hand-filed`. The general rules
in `message-style.md` apply (≤15 words per cell, blank line between
sections, prose last).

**Picture** — element 3. A reader should see the issue before reading it
(#1491: 29 of 50 recent issues had no table, diagram or image). Use the
first row that fits; a big issue can carry two:

| The issue has | Draw |
|---|---|
| A UI change | Screenshot of the screen now (`--screenshot`) + a mockup or GIF of the expected screen |
| A bug you can see | Screenshot of the actual state, broken element outlined, or a GIF of the repro |
| A clicked or typed flow | GIF recording, ≤8 MB (`--screenshot repro.gif`) |
| 3+ tables or entities | mermaid `erDiagram` (data) or `flowchart` (parts) |
| Steps across 3+ actors, in order | mermaid `sequenceDiagram` |
| Branches, retries or states | mermaid `flowchart` or `stateDiagram` |
| 3+ parallel facts, terms or options | Table, one row each |
| A plan of 3+ PRs | `\| # \| Step \| Depends on \|` table |
| None of the above | The change as a `\| \| Before \| After \|` table (#960) |

Motion: GitHub plays a GIF inline but strips an mp4 or `<video>` (#1475),
so record interactions as GIF — the browser tool's GIF recorder, or
`ffmpeg -i rec.mov -vf "fps=10,scale=960:-1" repro.gif`. A mermaid
diagram never draws a single line (A → B); write that sentence instead.
Agents always file with `issue create --lint=strict`: it prints what to
draw (read from the body's tables, plans and repeated bullets) and exits 2
with nothing filed. A person filing without the flag gets a `💡 picture:`
line instead.

**Bug-body core** — element 2's shape (blank lines are load-bearing):

```
**Business flow**
1. <role> <does what>
2. <role> <does what> → ❌ <what they see instead>

**Repro**
1. <exact step: URL, input, account>
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

**Business flow**
| # | Before | After |
|---|---|---|
| 1 | <role does, sees> | <role does, sees> |

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
**Business flow** is in business words only (`message-style.md` §
Business flow): roles,
screens, cards and payouts, never table names or routes; those go in
**What**, **Repro** or the evidence table. Internal work writes one line:
`**Business flow:** no change — <why>`.
