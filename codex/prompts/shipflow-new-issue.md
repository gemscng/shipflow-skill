---
description: File a new ShipFlow issue
argument-hint: <title / description>
---

Create a ShipFlow issue with `renaiss-shipflow issue create --lint=strict --title "..." --body "..."`, deriving the title and body from: $ARGUMENTS. Note: creating an issue does not claim it.

**Every body has a Business flow** (#1493): what the people using the product do and see, before → after, in roles and screens with no code names (`skills/shipflow/references/message-style.md` § Business flow). Internal work writes `**Business flow:** no change — <why>`.

**Every body over 120 visible words carries a picture** (#1491): a table, a mermaid diagram, a screenshot or a GIF. The ladder's element 3 below says which.

**A UI change carries a UI proposal, drawn before filing** (#1496): screenshot the screen now, draw the proposed screen (`skills/shipflow/references/browser-testing.md` § 7), and pass `--screenshot now.png --proposal proposal.png --proposal-caption "<what changed>"`. The image is for visualization and reference only, not a requirement: write what must be built in the text and the acceptance checklist. Show the person the proposal next to the issue link. A body that only mentions UI writes `**UI proposal:** none — <why>`.

Without any of these, `--lint=strict` exits 2, files nothing, and prints what is missing; fix the body and run the command again.

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

<!-- GENERATED from skills/shipflow/references/message-style.md § Issue-body ladder. Edit it there, then run: node scripts/check-issue-body-ladder.mjs --write -->

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
| A UI change | A **UI proposal** (below): screenshot of the screen now (`--screenshot`) + the proposed screen (`--proposal`) |
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

**UI proposal** — drawn BEFORE the issue is filed (#1496). An issue
that changes what a person sees shows the proposed screen, so the reader
looks at the change instead of picturing it (of 80 recent issues, 23 read
as a UI change and 4 of those had an image). It needs one when the
reporter would want to see it before it is built: a new page, screen,
dialog, component or empty state; a layout, navigation or visual change; a
new interaction; user-visible copy beyond a fix. It needs none for a bug
(it restores the screen it had: screenshot the actual state), back-end or
data work with no visible surface, tests or refactors. When in doubt, draw it.

**The image is for visualization and reference only, never a requirement.**
Write what must be built in the issue text and its acceptance checklist;
the drawing only helps a reader picture it. Nobody builds to its pixels,
colours or copy, and no PR is held for differing from it.

1. Screenshot the screen now: `--screenshot now.png`. A new screen has no
   "now"; skip this.
2. Draw the proposal on the live page: edit it in the browser (add the
   part, change the copy, hide what goes), outline what changed, and
   screenshot it. A screen that does not exist yet is one static HTML page
   in the repo's `DESIGN.md` tokens. Recipe: `browser-testing.md` § 7.
3. File with `--proposal proposal.png --proposal-caption "<what changed>"`.
   The CLI hosts it under `## UI proposal`, marked "for visualization and
   reference only — not a requirement", with the screenshots at the same
   width. Put `<!-- media -->` on its
   own line right under the body core: both sections go there (without
   it, at the end of the body).

In a session with a person, show them the proposal next to the issue link.
`--lint=strict` exits 2 and files nothing when the body reads as a UI
change (one word like button, dialog or layout, or two like page and tab)
and has no proposal. A body that only mentions UI says so in one line:
`**UI proposal:** none — <why>`. Filing approves nothing: the loop's
intake may draw option A of its design from the image, and the reporter
approves that wireframe, not the image (`loop-reviewer-intake.md` 4c).

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

Compact example body:

```
> 🟡 **P2 · bug · ux · effort S** · hand-filed

**Business flow**
1. Shop owner opens Settings and clears the shop name
2. Taps Save → ❌ the form clears and nothing tells them why

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

A screenshot is worth more than prose: when the report describes something visible (a broken layout, a wrong render, an error dialog) and a screenshot or recording file is available — or you can capture one with the browser tools (outline the broken element first: `outline: 3px solid #ff3b30; outline-offset: 3px`, never a box over it) — attach it with `--screenshot <path...>` (repeatable; add `--screenshot-caption "<what this shot shows>"` per shot, by position). The files are hosted and embedded in the issue body — reference them from the evidence table. If the upload fails the issue is NOT created — retry, or create without `--screenshot` and attach via `issue evidence --image` afterwards.

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-new-issue.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
