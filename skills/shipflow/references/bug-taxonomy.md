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

Tiers set pickup **order**, not eligibility — `issue next` has no severity
gate. `sortIssuesForPickup` (`apps/renaissshipflow-cli/src/issue-order.ts`)
sorts every actionable issue: `priority:` rank → `severity:` rank → newest
`createdAt`. A **low** issue is never skipped, only ranked last of the four
severity tiers; `issue next`
(`apps/renaissshipflow-cli/src/commands/issue.ts`) claims whatever lands on
top.

| Want | Do |
|---|---|
| Bias the queue | Label it with a tier word the ranker actually knows — anything else counts as unlabeled (`labelRank`, `issue-order.ts`) |
| Restrict a run to one tier | `issue next --label "severity:critical"` — one label per run, and it stacks with the assignee pre-filter below (`isActionableForPickup`, `issue-order.ts`) |
| Widen past your own assignments | `pickup-scope` defaults to `assigned`, so `issue next` filters to your gh login; `all` = repo-wide (`config.ts`) |
| Hand an issue back | `issue done <number>` (`issue.ts`) — drops the ShipFlow claim and clears `🤖 in-progress` server-side; closes nothing |

The CLI side of `issue done` is signal-only, but the server acts on the signal:
`HandleReleaseIssue`
(`apps/renaissshipflow-server/internal/adapter/http/cli_handler.go`) calls
`RemoveLabel(…, inProgressLabel)`, locked by
`TestHandleReleaseIssue_RemovesInProgressLabel`. So a released issue is no
longer held out by that label — but whether it is claimable again is
`isActionableForPickup`'s call (`issue-order.ts`), and the in-progress label is
only one of the several skips it applies. Read that function rather than assume
a release is enough. The stale self-heal (`isStaleInProgress` — no live claim
**and** no open PR) is the backstop for releases that are never sent: crashed
sessions, TTL-expired claims.

A merge via `pr automerge` (`pr.ts`) releases the claim on every linked
issue — closing-keyword refs and a `Part of #N` slice parent
(`linkedIssueNumbers`; #747). `pr merge` never releases claims. GitHub
still only auto-closes closing-keyword issues; a `--partial` parent stays
open. Hand a claim back without a merge with `issue done`. Otherwise
loop mode holds the claim until merge (`loop-mode.md`).

A reviewer may not `approve` a PR that leaves a **critical/high** finding from
its own brief unaddressed.

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
renaiss-shipflow issue create --lint=strict --title "<bug>" --body "<body — see shape below>" \
  --label bug --label auto-qa \
  --label "severity:<critical|high|medium|low>" \
  --label "area:<visual|functional|ux|content|performance|console|accessibility>" --json
```

The reviewer uses the same severity words in its verdict bullets
(`critical|high|medium|low`; `loop-reviewer.md`).

The body follows the **issue-body ladder** (`message-style.md`; demos:
#387 bug, #712 feature/task). Status-header source: `auto-qa sweep`.

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

## 4. Per-page QA checklist (the bug sweep's method)

Run on every page the sweep visits — systematic, not ad-hoc. Browse
snapshot/console **flags** are unverified here (`shipflow-browser` found
no local `browse` CLI), so this list is the method, not a flag contract.

1. **Visual scan** — annotated screenshot; layout/image/alignment breaks
2. **Interactive elements** — click every button, link, control; each does what it says?
3. **Forms** — fill + submit; empty, invalid, and edge data (long text, special chars)
4. **Navigation** — paths in/out: breadcrumbs, back button, deep links, mobile menu
5. **States** — empty, loading, error, full/overflow
6. **Console** — after interactions; new JS errors or failed requests?
7. **Responsiveness** — mobile + tablet viewports where relevant (`viewport 375x812`)
8. **Auth boundaries** — logged-out behavior; different roles

File a finding only when **reproduced** (retry once to rule out a fluke),
classified with a severity + category from §1–2, and not already an open
issue. Depth over breadth: 5–10 well-evidenced bugs beat 20 vague ones.
