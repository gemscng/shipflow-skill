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
- `path:line`, numbers, and short quotes beat descriptions.
- Asking a human to choose? Render a **decision table** — `| # | Decision | Recommendation |`
  — whose `#` matches the `N: answer` reply protocol. Every option row carries the
  loop's recommendation; never a bare open question.
- Table cells read in one breath: the ≤30-word visible-line cap applies **per cell**.
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
- **A blocked gate is not a code verdict.** When `request_changes` is
  forced by infrastructure (feature map empty/404, scan capture failed,
  CI runner outage), the FIRST body line is
  `Not a code defect — <gate> could not run.` followed by the one action
  that unblocks it. A bare red verdict on green code sends the author
  hunting for a bug that isn't there (#935, #929).
- **The recommendation appears once.** In the decision table's
  Recommendation column when there is a table, else as the single
  `**Recommendation:**` line — never both (#890 said "Hold" twice).
- **No ephemeral paths in visible text.** `/tmp/...` worktree paths mean
  nothing to a PR reader; machine-relevant detail rides in an HTML
  comment (`<!-- … -->`), which keeps it in the record without the noise.
- **Internal shorthand carries a gloss.** A contract/issue reference a
  repo newcomer can't decode gets 3–6 words of why:
  `#431 fail-closed (an empty map is a failed load)` — not bare
  `#431 fail-closed`.
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

PR body template (sections, all visual-first, blank line between each):
`Closes #N` (full fix) / `Part of #N` (slice) · **Root cause** ≤3 bullets, `mermaid`
if the failure is a flow · **Changed** table (file → before → after) · **Testing**
checklist with numbers · **Evidence** images/links.

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

### Commit messages: invoke the smart-commit skill

**Create every loop commit by INVOKING the bundled `smart-commit` skill**
— the Skill tool with the PLUGIN-QUALIFIED name
**`shipflow:smart-commit`** (#544: a bare name can resolve to another
plugin's same-named skill — same ambiguity class as the fully-qualified
`/shipflow:shipflow-loop` rule). No Skill tool / plugin namespace (Codex,
Cursor) → read and follow the skill file from your **resolved skill
root**: `~/.shipflow-skill/skills/smart-commit/SKILL.md` on Codex
(`references/codex.md`); the plugin-cache copy on Cursor
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
  test may ride with its fix (step 4).
- **Pre-commit**: lint + format clean before committing (step 4's tests
  satisfy the skill's test gate).
- **No AI-attribution trailer** — the skill's default; loop commits keep
  it (owner decision, #279). Footer = issue reference only;
  loop-authorship stays traceable via branch, PR, and account.

**One autonomous adaptation** (the loop has no human; the skill assumes
one): **skip the human-confirm gate** — execute the plan the skill
produced directly; the reviewer gate and your own tests are the
confirmation. Never block waiting for a human that isn't there (the
Spawned/headless posture in SKILL.md). Everything else applies as
written.

Do NOT edit the vendored `skills/smart-commit` skill to encode this — it
stays re-syncable; the one autonomous adaptation lives here.
