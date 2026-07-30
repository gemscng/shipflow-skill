---
description: Check if your current (issue-less) feature work relates to an open issue; open one if not (respects auto-issue)
---

The user is doing feature/change work without an issue. Detect a related open
issue, and otherwise open one:

0. **Skip trivial changes** — typo/copy/text edits, wording, comments,
   formatting, tiny cosmetic tweaks, version/lockfile bumps: just make them, no
   issue (even in auto mode). Only continue for substantive work worth tracking.
1. Summarize the work from $ARGUMENTS, the current branch, and `git diff`.
2. `renaiss-shipflow issues list --json --limit 1000` and semantically check whether
   an open issue already covers it. **Pass `--limit 1000`** — the default is 30,
   a newest-first slice that structurally cannot contain an older duplicate
   (issue #580).
   - If one clearly covers it → surface "#N — <title>" and offer `renaiss-shipflow issue work N` (no duplicate).
3. If none covers it → read `renaiss-shipflow config get auto-issue --json`:
   - `true` → auto-create with `renaiss-shipflow issue create --title "…" --body "…"`, report it, continue.
   - `issue create` runs its own near-verbatim duplicate guard and **exits 12**,
     creating nothing, when the title restates an open issue (issue #580). That
     is not a command failure: surface the candidates it printed and offer
     `issue work <n>` on the match, or re-run with `--allow-duplicate` when the
     work is genuinely separate. Your step-2 search is still required — the
     guard catches restatements, not paraphrases.
   - `false` → ask the user first; create only on a yes.
4. Reference the issue in the PR: `Fixes #N` (or `Closes #N`) when the PR fully
   resolves it; `Part of #N` — no closing keyword — for a partial slice, so
   merging leaves the parent open for the rest (same rule as /shipflow-pr;
   `renaiss-shipflow pr create --partial` emits the Part-of form).

Enable auto mode with `renaiss-shipflow config set auto-issue true`.
