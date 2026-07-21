# QA health score + baseline

A quantitative ship-readiness signal for the loop. The E2E pass and the bug sweep
compute a **health score (0–100)**; the worker attaches the **before→after delta**
to the PR as evidence; the reviewer and the auto-merge gate read it. A per-project
**baseline** lets each tick catch a regression a fix introduced nearby. Adapted
from gstack `/qa`.

## Contents
1. **Health score rubric** — weighted 0–100
2. **Score as PR evidence** — the delta the worker posts
3. **Baseline / regression mode** — detecting what a fix broke

## 1. Health score rubric

Score each category 0–100, then take the weighted average. Severity words are from
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

After the E2E pass verifies a fix, compute the score for the affected page(s) and
post the delta with the screenshot, so reviewer + merge gate see a number, not a vibe:

```bash
renaiss-shipflow issue evidence <n> --pr <pr> --file "$EV/after.png" \
  --caption "Verified: <what> · health <before>→<after> (Δ<+/-N>) · 0 new console errors"
```

The **reviewer** reads the delta: a PR whose score *drops* is a regression signal —
don't approve a negative delta unless it's an intentional, explained tradeoff. The
**auto-merge gate** treats a negative delta like an open thread: park, don't merge.

## 3. Baseline / regression mode

Persist a per-project baseline so the loop can tell a *new* bug from a known one and
catch what a fix broke in a **neighbouring feature** (the ones sharing paths in
`features --json`).

Store under the loop state dir (gitignored), keyed by project:

```json
// .worktrees/shipflow-loop/.shipflow/qa-baseline.json
{ "date": "YYYY-MM-DD", "healthScore": 86,
  "categoryScores": { "console": 100, "functional": 80, "...": 0 },
  "issues": [ { "id": "auto-qa-#123", "severity": "high", "area": "functional" } ] }
```

Each bug-sweep run, after scoring:
- **score dropped vs baseline** → something regressed since last sweep. Surface it
  prominently; if you can attribute it to a recent merge, file it `severity:high`.
- **issue in baseline now gone** → fixed; note it.
- **new issue not in baseline** → file it (per `bug-taxonomy.md` §3), add to baseline.
- Rewrite the baseline at the end of the sweep (current score + open issues).

When a worker fixes one issue, it re-scores the affected page **and its neighbours**
(shared-path features from the map). A neighbour whose score dropped = the fix
regressed it → the worker reverts or fixes before opening the PR, never ships it.
