# Message style — everything the loop writes on GitHub

Split from loop-mode.md (#611). Load when WRITING a PR body, issue body,
escalation, or commit — workers and reviewers, per dispatch.

## Message style — everything you write on GitHub (comments, PR bodies, issue bodies)

**This is the one authoritative copy** — `loop-worker.md`,
`loop-reviewer.md`, and `pr-feedback.md` point here; edit the contract
here only. Every message exists so a phone-skimming human can **judge it
in seconds**: graphics first, words last. For each piece of information,
use the FIRST format on this list that fits — prose is the fallback,
never the default:

1. **Table** — ≥3 parallel facts: files → changes, options → risks, checks → results.
2. **`mermaid` block** — only when the shape carries information prose can't:
   branching, concurrency, or ≥3 components interacting (GitHub renders mermaid
   natively). A linear A→B→C that restates one sentence or one formula is
   noise, not a diagram (measured: #945's flowchart re-drew a single division) —
   write the sentence.
3. **Checklist** — `- [x]` verified / `- [ ]` pending. Judgeable at a glance.
4. **Meter** — any ratio or progress: `▰▰▰▱▱ 3/5 merged`.
5. **Image** — screenshots, recordings, rendered cards as evidence. Seeing beats reading.
6. **Bullets** — only what no visual can carry: one point per bullet, ≤12 words.

Rules that hold for every format:

- Lead with the outcome: verdict / fixed / blocked — then the visuals.
- `path:line`, numbers, and short quotes beat descriptions — in GitHub
  writes, which carry a date. In anything **committed** (code comments,
  test names, docs) cite the symbol or selector (`.shell in globals.css`,
  `safeNext()`), never the line: a line number is wrong after the next
  edit to that file and nobody re-checks a comment.
- Asking a human to choose? Render a **decision table** —
  `| # | Decision | Recommendation | If chosen |` — whose `#` matches the
  `N: answer` reply protocol (**one `#` per decision**; continuation option
  rows leave `#` blank). Use those column names: the lint and the
  decision-panel parser read columns by name, and the only other names both
  accept are Option, Answer or Choice for Decision, and Consequence,
  Outcome, Then or Result for If chosen. Every option row carries the
  loop's recommendation
  AND what happens when that option is picked (#969: 2 of 25 live tables
  said; the lint now requires the column, or a `→` in every option cell);
  never a bare open question.

  **BAD** (every option numbered `1` — humans can't tell it's one decision;
  measured on renaiss-os-index #2263):
  ```
  | 1 | approve A — drawn, no email merge | yes | loop admits that slice |
  | 1 | B — also merge on Apple email | | loop admits email-link |
  | 1 | no — not worth doing now | | loop parks this |
  ```
  **GOOD** (first row carries `1`, continuations blank `#`):
  ```
  | 1 | approve A — drawn, no email merge | yes | loop admits that slice |
  |   | B — also merge on Apple email | | loop admits email-link |
  |   | no — not worth doing now | | loop parks this |
  ```
  `formatEscalationBody` normalizes BAD→GOOD on render; write GOOD.
- An option that hands the loop production access (`DATABASE_URL`, prod
  secrets, prod API keys) is never on the table — the choices for prod
  data work are "operator runs it" or "reproduce on a local DB first"
  (the escalation lint refuses the former; loop-mode.md § Guardrails).
- Table cells read in one breath: ≤15 words per cell. Explanation goes under the table.
- **Readability advisories (#1476).** The PR and issue create commands print
  `💡 readability:` lines for: bullets over 12 words, cells over 15 words,
  over 300 visible words, and a PR that does not open with `**Outcome:**`
  or keeps `**Risk:**` below line 8. They never block, `--lint=strict`
  included. Fix them anyway: they are what a reader trips on. What
  `--lint=strict` does block (exit 2, nothing created): for an issue, no
  **Business flow** section (§ Business flow), a body over 120 visible
  words with no table, diagram or image (§ Issue-body ladder, element 3),
  or a UI change with no UI proposal (same section); for a PR, the list
  in § PR body template. Fix the body and run it again.
- Detail nobody needs in order to act folds into `<details>`; it never renders unfolded.
- Cut openers ("I have reviewed…"), hedges, and restatements of the diff.
- If a bullet needs a second clause, split it or cut it.

GitHub collapses single newlines into one paragraph — put a **blank line
between every section** or bold-led line, and write enumerations as real
markdown lists (one item per line), never inline `1. … 2. …`.

### Reader-first invariants (#958 — measured on 25 merged PRs)

The reader is one human skimming a PR timeline that several agents wrote
into. These rules exist because each was violated at measurable cost:

- **One operative comment per decision.** Say a thing ONCE, in the
  artifact that owns it. The formal review carries the verdict + findings;
  the approve command's `--comment` is a **single stamp line** — never a
  second copy of the review's tables, checklist, or scan record (PR #927
  ended with six near-identical stamps; a reader cannot tell which is
  current).
- **Never hand-write a scan line.** The approve and post-review commands
  compute and append the one authoritative `🔍 Security scan:` record;
  a pasted copy is stripped, so writing one is pure waste (#874 carried
  three).
- **A no-change re-approve is ONE line.** After a rebase whose diff digest
  is unchanged: `Re-approved <sha12> — rebase only, diff unchanged.` as
  the entire review summary AND the entire approve comment. The full
  gate rundown lives in the original review; repeating it makes the
  reader diff two walls of text to learn nothing changed.
- **Empty fields are omitted, not printed.** `health Δ n/a` is a row that
  says nothing — a line/row/cell earns its place only when it has content.
- **A blocked gate is not a code verdict.** Empty-map / scan-capture fail /
  threads-unavailable → `--verdict blocked` (⏸ header from
  `verdicts.blocked`, zero findings). Never a line-1 severity/effort
  finding. The approve command still refuses. Scan flags stay unrequired
  (same as `request_changes`). A bare red verdict on green code sends the
  author hunting for a bug that isn't there (#935, #929).
- **The recommendation appears once.** In the decision table's
  Recommendation column when there is a table, else as the single
  `**Recommendation:**` line — never both (#890 said "Hold" twice).
- **No ephemeral paths in visible text.** `/tmp/...` worktree paths mean
  nothing to a PR reader; machine-relevant detail rides in an HTML
  comment (`<!-- … -->`), which keeps it in the record without the noise.
- **Internal shorthand carries a gloss.** A contract/issue reference a
  repo newcomer can't decode gets 3–6 words of why:
  `#431 fail-closed (an empty map is a failed load)` — not bare
  `#431 fail-closed`. The fixed list (`INTERNAL_JARGON` in message-lint.ts:
  R3/R4, dual-read, cutover, fail-closed, merge-repoint, once-key,
  escalate-once, reconcile, intake, precedent, slice, WIP, fan-out,
  harvest, auto-qa, feature map) is linted on `issue create`: a term's
  first use in visible prose must carry `(…)`, ` — …` or `: …` on the same
  line (12 of 60 renaiss-os-index bodies used ≥3 unglossed, #969).
- **Hashes are 12 chars visible.** Full digests belong in hidden markers.

### Before → after — every change-describing message (#960)

A message about a change — one **needed** (finding, bug, escalation option)
or one **made** (PR body, fix comment, evidence) — always shows the pair:
what the reader observes BEFORE and AFTER the change. A change described
one-sided forces the reader to reconstruct the other half from prose.
Render the pair in the FIRST graphical form that fits:

1. **Code** — a ```suggestion / ```diff fence: the diff IS the pair, add no
   prose copy of it.
2. **Behavior / config / metric** — a `| Before | After |` table row
   (findings JSON carries it as the `before` / `after` fields, ≤20 words
   each; the CLI and server render the table).
3. **UI** — paired screenshots, labeled Before / After.
4. **Flow shape** — mermaid, only under the mermaid rule above (old branch
   vs. new branch, or two small graphs).

Both-or-neither: a lone half is not a pair — renderers drop it. Bug bodies
already carry the pair as **Actual** (before) / **Expected** (after) —
never duplicate it in prose; add a graphical pair only when the change is
visual or structural (then it lands in the evidence table).

A PR body follows § PR body template below.

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

### Business flow — every issue and PR body (#1493)

A reader who has never seen the code should be able to follow what changes
for the people who use the product. Every issue and PR body has a visible
**Business flow** section (never folded into `<details>`): in an issue right
after **Why**, in a PR right under **Outcome** and **Risk**.

| The change | Shape |
|---|---|
| Changes what someone does or sees | `\| # \| Before \| After \|` table, one row per step |
| A bug | Numbered steps of the user's journey; ❌ on the step that breaks |
| Branches, or 3+ roles taking turns | Also a mermaid `flowchart` or `sequenceDiagram`, same words |
| Internal only (refactor, CI, tests) | One line: `**Business flow:** no change — <why>` |
| Filed by a machine before anyone knows the user impact | One line: `**Business flow:** not assessed — <why>` |

Write it clean:

- Actors are roles: Admin, Shop owner, Collector, Reviewer, the loop.
- Steps say what the person does and sees: "Admin picks a storage location".
- Business objects, not storage: "card", "branch", "payout", never `consigned_cards`.
- No table names, file paths, routes, API or database words, or code spans.
  Those belong in **Changed** or the technical part below.
- At most 7 steps. In the After column, bold the steps that changed.

**BAD:** `API->>action_logs: insert move row` ·
**GOOD:** `Admin moves 40 cards to "Safe" → Activity Log shows one move`

`issue create --lint=strict` and `pr create --lint=strict` refuse a body
without the section (exit 2, nothing created); a "no change" line needs a
reason. Code names inside the section print a `💡 business flow:` line.
Issues and PRs the server files (bug triage, review findings, auto-revert)
are tested against the same rules (`internal/bodyrules`, with
`contracts/body-rules-vectors.json` shared by both sides).

### Confirmation-only notification — one PR reply surface (#975)

`renaiss-shipflow issue point-confirm <parent> --for-pr <pr> --once-reason
<escalateOnceReason>` emits exactly one visible issue line:

`⏸ Confirm on PR #N → https://github.com/owner/repo/pull/N#new_comment_field`

The PR owns the confirmation and correction. Never add an issue reply
protocol, numbered decision table, decision panel, or second confirmation
ask to this pointer. Labels, claims, precedents, and gate authorization stay
unchanged. The hidden loop and once-key markers preserve machinery identity
and authenticated notification suppression. Parent tokens remain nudges.
Ordinary and mixed decisions retain the escalation contract below; a reason
mentioning “confirm PR” alone never proves confirmation is its only ask.

### Escalation comment — the 🚧 shape (#969)

Measured on 38 live escalations: median 38 lines and 215 words, three
`<details>` folds each, the same footer and rationale paragraph on every
one, and 13 that asked the reader to reply on a PR they had to go find.
The comment the escalate command renders keeps only the header, the
Action-needed section (**≤ 10 non-blank lines**, the lint's
`ACTION_SECTION_LINE_CAP`; the `###` heading is not counted), one fold
and one footer line visible:

| Line | Carries |
|---|---|
| 1 | `🚧 **Needs a human** — \`<category>\` · @<owner> decides` (validated category is an inline-code badge) |
| 2 (only when the reply belongs elsewhere) | `**Reply on PR #N, not here →** <PR comment-box URL>` — auto-added when the reason says "confirm … PR #N" |
| 3 onward | the `### 👤 Action needed` section: **one short context line** (what's stuck / who decides what), then the decision table — no vague ask, no wireframe jammed between ask and table; **≤ 10 lines** (lint) |
| next | ONE `<details>` holding every other section (`Why it's blocked · Ready once unblocked`) — each **≤ 60 words of prose, ≤ 30 a line** (lint) |
| footer | one `<sub>` line: the reply protocol, 14 words — the category is the badge on line 1, never repeated here |

Pass multiline source text with `issue escalate <n> --reason-file reason.md`;
`--reason-file -` reads UTF-8 stdin to EOF. Inline `--reason "..."` remains
available. Supply one source only, including when the inline value is empty.
The selected text is trimmed once; internal newlines stay intact.

Source reasons must contain **no literal backtick (U+0060)** anywhere:
escaping, fences, comments and folded sections are not exceptions. Canonical
footer code spans are generated after lint and remain unchanged. The explicit
`--force` option bypasses lint for a human; it does not bypass conflicting
sources, unreadable files, category or once-key checks. The loop fixes its
reason instead of using that bypass.

For structured reasons, keep Action-needed present and ≤ 10 lines. Lead
Action-needed with **one short context line** (what's stuck / who decides
what), then the decision table — context buried under a wireframe or a vague
ask is a scan failure. Advertise at least **two distinct complete reply
choices**, each with an answer and a nonempty consequence; repeating a choice
does not count twice, and an extra incomplete choice fails. Alternatives may
share a decision number (**one `#` on the first option row; continuation rows
leave `#` blank** — never repeat the same numeric `#` on every row). Tables need
populated options and an **If chosen**, Consequence, Outcome, Then or Result
column (or an arrow in each option). A header alone is insufficient.
A `**Recommendation:**` line never doubles a table column; no option hands
the loop production access. Plain one-line dependency reasons remain valid.

**The fold is capped too** — it hides a section until it is opened, it does
not shorten it (measured on 81 folded sections of 132 live banners: median
42 prose words, 23 over 100, longest 395). Per folded section: **≤ 60 words
of prose**, one point per line, **≤ 30 words a line** (lint). Three or more
parallel facts — measurements, per-width or per-language results — are a
table (per-cell cap, not counted). Detail the reader does not need in order
to choose stays on the PR or issue.

**BAD** (rental-portal #996 — this line is 104 words; the fold held 292):
```text
What A costs, measured with the compiled stylesheet: a row is 44px tall
today. Under A it is 62px on two lines when the list is about 700px or
wider, 84px on three lines at a typical desktop window, and 103 to 106px …
```
**GOOD** (the same numbers):
```text
| List width | Row under A (44px today) |
|---|---|
| 700px or wider | 62px, 2 lines |
| typical desktop window | 84px, 3 lines |
| 444px, the narrowest | 103 to 106px, 4 lines |
```

Example contents of reason.md (the Markdown fence is not part of the file):

```text
### Action needed
1. Install the GitHub App on the repository.
1: done → loop rechecks access
1: skip → loop parks this issue

### Why it's blocked
The repository check cannot finish without the App installation.
```

#### Design proposal — the `design` escalation

A design-bearing issue is escalated BEFORE it is built
(`loop-reviewer-intake.md` 4c). Same 🚧 shape, category `design`;
Action-needed IS the proposal: **one short context line**, then the decision
table (one row per reply: approve · the alternative · change — first `#`
only; continuations blank). The ASCII wireframe (≤ 4 rows: boxes, labels,
order — no fence; every non-blank line counts toward the 10-line cap) lives
in `### Design notes` with states, placement and the style source, **one
line each** — that section folds, so Action-needed stays scannable, and the
fold cap above applies: what an option costs (heights, widths, per-language
results) is a table, never a sentence of numbers. Reply grammar is the usual
`N: answer`:

```text
### Action needed
Pick the layout for the collection share card — reporter chooses A, B, or change.
| # | Decision | Recommendation | If chosen |
|---|---|---|---|
| 1 | approve — A, PnL toggle on the card (drawn) | yes: one tap, visible | loop builds A |
|   | B — PnL toggle inside the Share menu | | loop builds B |
|   | change — say what changes | | loop re-proposes |

### Design notes
    +-----------------------------------+
    | [avatar] Name           [Share ▾] |
    | 12 cards · est. $1,240   (PnL ▢)  |
    | [card][card][card][card]   +8     |
States: empty (no cards → "Add your first card"), loading (skeleton row), error (retry link).
Lives at /collections/:id, Share button in the header. Tokens and type per DESIGN.md.

### Why it's blocked
Taste and product fit are the reporter's call; a rebuilt card costs a full rework.
```

**One live 🚧 per issue**: a second plain escalation while the
label is on is refused — use `--update` (edits in place) or `--force` to
stack deliberately; the escalate-once path is exempt.

### Judge block — the top of every loop-touched issue (#969)

The purpose of every message on an issue is one human **judging** with the
least context-gathering. Measured before #969 a reader scrolled 62 / 30 / 33
lines (#962 / #963 / #965) to reach the line that said what to do, because
state lived in the thread's chronology and the ladder is ordered for the
worker (repro first, decision nowhere). The Judge block fixes the reading
order without touching the ladder: **≤4 blockquote lines, first thing in
the body, edited in place at every state change**, between
`<!-- shipflow:judge state=<s> since=<iso> -->` … `<!-- shipflow:judge-end -->`.

```
> ⏸ **Waiting on you** · 1 decision · since 2026-09-01 05:41Z
> **State** ▰▰▰▱▱ PR #966 green (CI 2/2, scan clean) · blocked: feature-map gate → #965
> **Decide** `1: done → loop re-reviews` · `1: skip → loop parks this`
> **Impact** `renaiss-shipflow test` red on clean main
```

| Line | Carries | Rule |
|---|---|---|
| header | state · decision count · `unblocks N issues` · since · checked | states: ⚪ Queued · 🟢 Loop working · 🔵 PR in review · ⏸ Waiting on you · 🔴 Blocked externally · ✅ Merged. `since` resets only when the state changes (`--since <iso>` to backdate from the label/comment that set it); `checked` is the heartbeat — refreshed on every upsert, so a stale `since` never reads as abandoned; `unblocks N` (`--fan-out`) is how many ⏳ issues transitively wait on this decision — triage by that number |
| **State** | meter · `PR #n <standing>` · `blocked: <chain>` | meter = acceptance progress `▰▰▱▱▱ 2/5 accepted` when the ladder has a checklist, else the pipeline stage (claimed 1 · PR open 3 · approved 4 · merged 5); a blocked issue's chain is walked from its ⏳ markers to the root: `#1548 → #1544 → waits on you (1: A → …)` — the root's first reply in parentheses; empty parts omitted, never blank |
| **Decide** | every reply the human can type, each with its consequence | `waiting` requires ≥1; omitted otherwise |
| **Impact** | what it costs if nobody acts | hoisted from the ladder's `**Impact**` line unless given |

**Never hand-write it** — `renaiss-shipflow issue judge <n> --state <s> [--pr
N --pr-status "…"] [--blocker "… → #M"] [--fan-out] [--decide "1: done → …"]…
[--impact "…"]` renders, validates (waiting without a reply, blocked with
neither a `--blocker` nor a ⏳ marker to walk, a decision without `N: ` or `→`
are refused) and upserts it idempotently. `--state blocked` without
`--blocker` walks the waiting-on chain itself (one read per hop, ≤4 hops);
`--fan-out` on a waiting block counts the ⏳ issues that hang on it.
`--json` reports `linesToAction` — the reviewer's self-verify metric, target
≤ 4. The loop runs it at claim (`working`), PR open (`review`), gate blocked
(`blocked`), escalation (`waiting`, decisions = the escalation's replies) and
merge (`merged`); server-filed issues get their first block on the loop's
claim.

**Enumerate every reply.** The escalation footer's `N: <answer>` is a
grammar, not a vocabulary: a decision must spell out the replies it accepts
and what each does — `1: done → loop re-reviews` · `1: skip → loop parks
this` — even when there is one action. `lintEscalationReason` refuses a
structured reason with neither a decision table nor a `N: … → …` line.

**One live loop comment per issue.** The intake brief ("Unknowns &
assumptions") goes through `renaiss-shipflow issue brief <n> --body-file
<path|->`: the first run posts it (ending `<!-- shipflow:intake -->` +
`<!-- shipflow:loop -->`), every later run edits that comment in place and
folds the superseded text under `<details>History</details>`. A second
intake table in a thread is a bug (#962).

### Provenance — every comment says it is ShipFlow's (#980)

ShipFlow may comment under a human member's own GitHub account (a
token-mode tenant, or the operator's `gh`), so nothing is ever inferred
from the author. Every comment ShipFlow writes ends with the visible footer
`<sub>🤖 ShipFlow</sub>` and the hidden marker
`<!-- shipflow:by surface=<server|cli|chatbot> -->`. The stamp is appended
automatically at the write choke points (server `AddComment` /
`UpdateIssueComment` / `ReplyToReviewComment` / `CreatePRReview`, CLI
`ghIssueComment` / `ghUpdateIssueComment` / `ghCreateReview`) and ONLY
when the body carries no `<!-- shipflow:` marker yet — a deliberately shaped
comment (🚧 banner, judge block, reply ack, intake note, review finding) is
unchanged. Issue and PR BODIES are not stamped: a ShipFlow-filed issue already
carries `<!-- shipflow:triaged -->`, and the ladder below owns that shape.
Readers keep judging by shape: any `<!-- shipflow:` marker means machinery,
never a human decision. A reply a human types in GitHub's box carries
neither, so every gate keeps working with one shared account. Never
hand-write the footer or the marker.

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

### Commit messages: invoke the smart-commit skill

**Create every loop commit by INVOKING the bundled `smart-commit` skill**
— the Skill tool with the PLUGIN-QUALIFIED name
**`shipflow:smart-commit`** (#544: a bare name can resolve to another
plugin's same-named skill — same ambiguity class as the fully-qualified
`/shipflow:shipflow-loop` rule). No Skill tool / plugin namespace (Codex,
Cursor) → on Codex invoke `$smart-commit` (installed by `codex/install.sh`,
`references/codex.md`), else read and follow the skill file from your
**resolved skill root**: `~/.shipflow-skill/skills/smart-commit/SKILL.md`
on Codex; the plugin-cache copy on Cursor
(`references/cursor.md`) — plugin-relative `skills/smart-commit/SKILL.md`,
never the loop worktree, never a bare name. Not a hand-written `git commit`: the skill
splits the staged diff into atomic units and writes Angular conventional
messages — let it do categorize / split / format. One authoritative copy;
`loop-worker.md` and `pr-feedback.md` point here.

What the skill produces (sanity-check its output):

- **Format**: `type(scope): subject` — `feat`/`fix`/`docs`/`refactor`/
  `test`/`perf`/`chore`/`ci`/`build`/`style`; imperative subject, no
  capital, no period, ≤50 chars; body wrapped at 72 (*what and why*);
  footer = the `Closes #N` / `Part of #N` reference (matching the PR
  body).
- **Atomic**: one logical unit per commit — new-construct / modification
  / config / docs / refactor / bug-fix / test split out; the regression
  test may ride with its fix (`loop-worker.md` step 4).
- **Pre-commit**: lint + format clean before committing (`loop-worker.md` step 4's tests
  satisfy the skill's test gate).
- **No AI-attribution trailer** — the skill adds an `Assisted-by`
  trailer by default; loop commits omit it (owner decision, #279) and
  the skill honors a caller's "no AI attribution". Footer = issue
  reference only;
  loop-authorship stays traceable via branch, PR, and account.

**One autonomous adaptation** (the loop has no human; the skill assumes
one): **skip the human-confirm gate** — execute the plan the skill
produced directly; the reviewer gate and your own tests are the
confirmation. Never block waiting for a human that isn't there (the
Spawned/headless posture in SKILL.md). Everything else applies as
written.

Do NOT edit the vendored `skills/smart-commit` skill to encode this — it
stays re-syncable; the one autonomous adaptation lives here.
