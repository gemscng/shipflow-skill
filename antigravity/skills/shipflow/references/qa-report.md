# QA health score + baseline

The E2E pass and the bug sweep compute a **health score (0–100)**; the worker
posts the **before→after delta** as PR evidence; the reviewer and the
auto-merge gate read it. A per-project **baseline** catches regressions a fix
introduced nearby.

## Contents

1. **Health score rubric** · 2. **Score as PR evidence** · 3. **Baseline /
regression mode**

## 1. Health score rubric

Score each category 0–100; overall = weighted average. Severity words:
`references/bug-taxonomy.md`.

**Console** (weight 15%): 0 errors → 100 · 1–3 → 70 · 4–10 → 40 · 10+ → 10
**Links** (10%): 0 broken → 100 · −15 per broken link (min 0)
**Per-category** (visual, functional, ux, content, performance, accessibility) —
each starts at 100, deduct per finding: critical −25 · high −15 · medium −8 · low −3 (min 0).

| Category | Weight | Category | Weight |
|---|---|---|---|
| Console | 15% | Performance | 10% |
| Links | 10% | Content | 5% |
| Visual | 10% | Accessibility | 15% |
| Functional | 20% | UX | 15% |

`score = Σ (category_score × weight)`.

## 2. Score as PR evidence

After the E2E pass verifies a fix, score the affected page(s) before and
after, and post the delta with the screenshot via `renaiss-shipflow issue
evidence`, the delta in the caption:
`health <before>→<after> (Δ<+/-N>)` (exact invocation:
`browser-testing.md` §6).

Fix evidence: `validateEvidenceSelection`
(`apps/renaissshipflow-cli/src/evidence.ts`). Reviewer: a dropping score is a regression
signal — don't approve a negative delta unless it's an intentional, explained
tradeoff. Auto-merge gate: a negative delta = an open thread — park, don't
merge.

## 3. Baseline / regression mode

Persist a baseline so the loop can tell a *new* bug from a known one and catch
what a fix broke in a **neighbouring feature** (shared paths in
`features --json`). Store it **outside the loop worktree**, in the CLI's own
state dir, keyed by repo:

```json
// ~/.config/renaissshipflow/qa-baseline-<owner>-<repo>.json
{ "date": "YYYY-MM-DD", "healthScore": 86,
  "headSha": "<origin/<default> HEAD at sweep time>",
  "lastSweepAt": "YYYY-MM-DDTHH:MM:SSZ",
  "categoryScores": { "console": 100, "functional": 80, "...": 0 },
  "issues": [ { "id": "auto-qa-#123", "severity": "high", "area": "functional" } ] }
```

`headSha` + `lastSweepAt` make the sweep **skippable** — nothing merged since
a recent sweep → skip (an idle repo at ~15-min ticks would otherwise burn a
full E2E + QA pass ~96×/day). Skip rule: `loop-mode.md` §C.

**Never inside the worktree** — the loop tears it down at run end: a baseline
under `.worktrees/shipflow-loop/…` is deleted, every sweep reads "no
baseline", and Phase C's regression half silently no-ops. The path also
moves — `EnterWorktree` (the *preferred* setup) creates
`.claude/worktrees/shipflow-loop`, not `.worktrees/`.
`~/.config/renaissshipflow/` is stable across runs/worktrees/branches —
nothing to gitignore.

Each bug-sweep run, after scoring:
- **score dropped vs baseline** → regression; surface prominently, file
  `severity:high` if attributable to a recent merge.
- **baseline issue now gone** → fixed; note it.
- **new issue** → file it (`bug-taxonomy.md` §3), add to baseline.
- Rewrite the baseline at sweep end (score + open issues **plus a fresh
  `headSha` and `lastSweepAt`**, or the next idle tick can't skip).

A worker fixing an issue re-scores the affected page **and its neighbours**
(shared-path features); a dropped neighbour = the fix regressed it → revert
or fix before opening the PR, never ship it.
