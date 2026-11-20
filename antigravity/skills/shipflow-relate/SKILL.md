---
name: shipflow-relate
description: "Check if your current (issue-less) feature work relates to an open issue; open one if not (respects auto-issue)"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

The user is doing feature/change work without an issue. Detect a related open
issue, and otherwise open one:

0. **Skip trivial changes** — typo/copy/text edits, wording, comments,
   formatting, tiny cosmetic tweaks, version/lockfile bumps: just make them, no
   issue (even in auto mode). Only continue for substantive work worth tracking.
1. Summarize the work from $ARGUMENTS, the current branch, and `git diff`.
2. `renaiss-shipflow issues list --json --limit 1000` and semantically check whether
   an open issue already covers it. **Pass `--limit 1000`** — a smaller limit is
   a newest-first slice that structurally cannot contain an older duplicate
   (issue #580).
   - If one clearly covers it → surface "#N — <title>" and offer `renaiss-shipflow issue work N` (no duplicate).
3. If none covers it → read `renaiss-shipflow config get auto-issue --json`:
   - `true` → auto-create with `renaiss-shipflow issue create --lint=strict --title "…" --body "…"`, report it, continue.
   - `issue create` runs its own near-verbatim duplicate guard and **exits 12**,
     creating nothing, when the title restates an open issue (issue #580). That
     is not a command failure: surface the candidates it printed and offer
     `issue work <n>` on the match, or re-run with `--allow-duplicate` when the
     work is genuinely separate. Your step-2 search is still required — the
     guard catches restatements, not paraphrases.
   - `false` → ask the user first; create only on a yes.
4. Link the issue through `pr create --lint=strict --issue N`: its footer says
   `Closes #N` when the PR fully resolves it, or `Part of #N` with `--partial`
   for a slice, so merging leaves the parent open for the rest (/shipflow-pr).
   Do not hand-write the link.

Enable auto mode with `renaiss-shipflow config set auto-issue true`.
