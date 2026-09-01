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
renaiss-shipflow issue create --title "<bug>" --body "<body — see shape below>" \
  --label bug --label auto-qa \
  --label "severity:<critical|high|medium|low>" \
  --label "area:<visual|functional|ux|content|performance|console|accessibility>" --json
```

The reviewer uses the same severity words in its verdict bullets
(`critical|high|medium|low`; `loop-reviewer.md`).

The body follows the **issue-body ladder** (`message-style.md`; demos:
#387 bug, #712 feature/task). Status-header source: `auto-qa sweep`.

### Issue-body ladder — every ShipFlow-filed issue body

**Authoritative for EVERY issue body ShipFlow files** — loop bug-sweep /
auto-qa issues, Phase-B follow-up sub-issues, feature-relate auto-issues,
harvest-filed issues, hand-filed `/shipflow-new-issue`. Issue #387 is the
live demo. Build top-down:

| # | Element | When | Shape |
|---|---|---|---|
| 1 | **Status header** | always — the first line | one blockquote line: `> <priority emoji> **P<n> · <type> · <area> · effort <S/M/L>** · <wave/source>` |
| 2 | **Body core** | always | bug → the Repro core below; feature/task → the Why/What/Example core below |
| 3 | **Mermaid diagram** | the defect or design branches, races, or spans ≥3 interacting components — never for a linear restatement of one line | small `flowchart`/`sequenceDiagram`/`stateDiagram` — beats prose causality when the SHAPE is the point |
| 4 | **Evidence table** | any `file:line` claim | `\| Claim \| Where \|` — every claim grounded in `path:line` / links / screenshots |
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
