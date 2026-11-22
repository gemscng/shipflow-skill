---
description: Check if your current (issue-less) feature work relates to an open issue; open one if not (respects auto-issue)
---

The user is doing feature/change work without an issue. Detect a related open
issue, and otherwise open one:

0. **Skip trivial changes** — typo/copy/text edits, wording, comments,
   formatting, tiny cosmetic tweaks, version/lockfile bumps: just make them, no
   issue (even in auto mode). Only continue for substantive work worth tracking.
1. Summarize the work from $ARGUMENTS, the current branch, and `git diff`.
2. Run `renaiss-shipflow issue match "<summary>" --json` (scans the full 1,000-issue
   open window, joins active claims, and returns top candidates plus `issueTrack`).
   - If one clearly covers it → under `auto`, claim with `renaiss-shipflow issue work N --json`
     and report `Tracking under #N — <title>`; under `ask`, confirm first (no duplicate).
     If `claimedBy` is someone else, warn before touching code.
3. If none covers it → act on `issueTrack` (`auto` | `ask` | `off`):
   - `auto` → auto-create and claim atomically with
     `renaiss-shipflow issue create --claim --lint=strict --title "…" --body "…"`,
     report it, and continue.
   - `issue create` runs its own near-verbatim duplicate guard and **exits 12**,
     creating nothing, when the title restates an open issue (issue #580). That
     is not a command failure: surface the candidates it printed and claim
     `issue work <n>` on the match, or re-run with `--allow-duplicate` when the
     work is genuinely separate.
   - `ask` → ask the user first; create with `--claim` only on a yes.
   - `off` → skip creating an issue.
4. Link the issue through `renaiss-shipflow pr create --json --lint=strict --issue N`
   (`--partial` for a slice; `--no-issue` only for trivial/chore PRs): its footer
   says `Closes #N` when the PR fully resolves it, or `Part of #N` with `--partial`
   so merging leaves the parent open for the rest (/shipflow-pr). Do not
   hand-write the link.

Configure with `renaiss-shipflow config set issue-track auto|ask|off` (default `auto`).
