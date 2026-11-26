# Feature work without an issue — detect & relate

Run this when the user is doing feature/change work in a ShipFlow project with
no tied issue — they describe building something, start a feature branch, or
are about to open a PR with no `Fixes #N`. Never let substantial work land
un-tracked; never create duplicate issues.

## Steps

0. **Skip trivial changes — no issue needed.** A typo/copy/text edit, wording
   or label change, comment, formatting/whitespace, tiny cosmetic tweak,
   version bump, or lockfile update: just make it — do **not** detect, ask,
   or create an issue, **even in auto mode**. Run the rest only for
   substantive feature/behavior/bug work worth tracking. When unsure: lean
   trivial for one-liners; lean track-it for anything touching logic, data,
   or user-facing behavior.
1. **Summarize the work** in a sentence or two (the user's description, the
   branch name, and/or `git diff` / recent commits) — that intent is the query.
2. **Find candidates:** `renaiss-shipflow issue match "<summary>" --json`
   (scans the full 1,000-issue open window, joins active claims and related open
   PRs in `relatedPrs`, and returns the top matches plus `issueTrack`: `auto` |
   `ask` | `off`). Use `renaiss-shipflow pr match "<summary>" --json` (or
   `--issue <n>`) to search open PRs directly before opening a duplicate PR. If
   `truncated: true`, raise `--scan-limit` or fall back to
   `renaiss-shipflow issues list --json --limit 2000` before treating the list
   as complete (#582).
3. **Match (you verify — it's semantic).** Compare the work against the top
   candidates; be conservative — only a match when the work plainly implements
   or fixes that issue.
   - **Match →** if `claimedBy` is another agent/person, warn before touching
     code. Under `issueTrack: "auto"`, claim directly with
     `renaiss-shipflow issue work N --json` and report `Tracking under #N — <title>`;
     under `"ask"`, confirm *"This looks covered by **#N — <title>**. Work under it?"*
     first. Do **not** open a duplicate.
4. **No match →** act on `issueTrack` (or `renaiss-shipflow config get issue-track --json`):
   - **`issueTrack: "auto"`** (default; also enabled by `auto-issue true`) → create
     and claim atomically:
     `renaiss-shipflow issue create --claim --lint=strict --title "<concise>" --body "<ladder body>"`,
     report which issue you opened, and continue — **don't ask**.
   - **`issueTrack: "ask"`** → **ask** first: "No open issue covers this — want
     me to open one? (proposed title: …)". Create with `--claim` only on a yes.
   - **`issueTrack: "off"`** → skip creating an issue.
   - **Either way, `issue create` may exit 12** — its near-verbatim duplicate
     guard found an open issue restating your title and created nothing
     (#580). Treat that as a step-3 **Match**, not a failure: surface the
     candidates it printed and claim with `issue work <n>`, or re-run with
     `--allow-duplicate` when the work is genuinely separate. The guard
     catches restatements only — your semantic step-3 pass still catches
     paraphrases.

   The body follows the **issue-body ladder** (`message-style.md`; demos:
   #387 bug, #712 feature/task). Status-header source: `auto-issue`.

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

5. Once linked (matched or created), open the PR with `pr create --lint=strict --issue N`
   (`--partial` for a slice); its footer links the issue. Do not hand-write
   `Fixes #N` for it. When `--issue` is omitted and `auto-relate-pr` is on
   (default when `issue-track` is `auto`; toggle with `config set auto-relate-pr
   true|false` or `--auto-relate` / `--no-auto-relate`), `pr create --lint=strict`
   conservatively matches an unambiguous, uncontested open issue from the PR
   title/outcome, links it automatically, and warns on related open PRs. For an
   already-open PR, inspect or apply its link with `renaiss-shipflow pr relate
   <pr> --apply --json`.

## Auto mode

Auto-tracking defaults to `auto` (`issue-track`):

```
renaiss-shipflow config set issue-track auto      # default (or env SHIPFLOW_ISSUE_TRACK=auto)
renaiss-shipflow config set issue-track ask       # prompt before claiming fuzzy matches or filing
renaiss-shipflow config set issue-track off       # disable ambient tracking
renaiss-shipflow config set auto-relate-pr true   # auto-link unambiguous open issues & warn on sibling PRs during PR creation (default follows issue-track=auto; env SHIPFLOW_AUTO_RELATE_PR)
```

Legacy `renaiss-shipflow config set auto-issue true|false` (or env
`SHIPFLOW_AUTO_ISSUE`) continues to work when `issue-track` is unset. To
disable the session hint and `gh pr create` gate completely, set
`SHIPFLOW_ISSUE_TRACK_HOOK=false`. See `references/issue-track-first.md`.
