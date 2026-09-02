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
2. **List candidates:** `renaiss-shipflow issues list --json`.
   Default window is 1000 (same as the create pre-flight). If the envelope
   has `truncated: true`, the window is FULL — older issues were not
   returned; raise `--limit` before treating the list as complete
   (#582; the old default `--limit 30` is how #579 restated #427).
3. **Match (you do this — it's semantic).** Compare the work against each open
   issue's title + body; be conservative — only a match when the work plainly
   implements or fixes that issue.
   - **Match →** "This looks covered by **#N — <title>**. Work under it?" On
     yes: `renaiss-shipflow issue work N`. Do **not** open a duplicate.
4. **No match →** check `renaiss-shipflow config get auto-issue --json`.
   - **`autoIssue: true`** → create automatically:
     `renaiss-shipflow issue create --title "<concise>" --body "<ladder body>"`,
     report which issue you opened, and continue — **don't ask**.
   - **`autoIssue: false`** (default) → **ask** first: "No open issue covers
     this — want me to open one? (proposed title: …)". Create only on a yes.
   - **Either way, `issue create` may exit 12** — its near-verbatim duplicate
     guard found an open issue restating your title and created nothing
     (#580). Treat that as a step-3 **Match**, not a failure: surface the
     candidates it printed and offer `issue work <n>`, or re-run with
     `--allow-duplicate` when the work is genuinely separate. The guard
     catches restatements only — your semantic step-3 pass still catches
     paraphrases.

   The body follows the **issue-body ladder** (`message-style.md`; demos:
   #387 bug, #712 feature/task). Status-header source: `auto-issue`.

### Issue-body ladder — every ShipFlow-filed issue body

**Authoritative for EVERY issue body ShipFlow files** — loop bug-sweep /
auto-qa issues, Phase-B follow-up sub-issues, feature-relate auto-issues,
harvest-filed issues, hand-filed `/shipflow-new-issue`. Issue #387 is the
live demo. Build top-down:

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

5. Once linked (matched or created), reference it in the PR body (`Fixes #N`).

## Auto mode

Enable auto-create with:

```
renaiss-shipflow config set auto-issue true     # or env SHIPFLOW_AUTO_ISSUE=true
```

With it on, step 4 never prompts — it opens the issue and proceeds. Turn off
with `renaiss-shipflow config set auto-issue false`.
