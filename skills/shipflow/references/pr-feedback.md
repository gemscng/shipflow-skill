# Resolving PR review feedback (loop reconcile, step 1)

Work through **every** reviewer comment (human and bot, e.g.
gemini-code-assist) on loop-authored PRs needing attention; fix what you can,
then reply via `renaiss-shipflow pr note <n> --body …` (#603 — the marked path; bare `gh pr comment` on a loop PR re-reads as a reporter correction, #477). Only act on **your own** PRs.

## 1. Gather every comment — don't miss inline ones

`pr reviews --json` is a read-only query like `pr ready` — the worklist
(unresolved threads block approval/merge). Parse JSON `blocking` +
`unresolvedThreads`; rc is not the signal (always 0). Gates stay
the approve gate (exit 7) and `pr automerge` (exit 5). Start with the compact
worklist, then read the full finding text for the threads you will address.
Selection limits output, never the global blocker count. A missing/stale
thread ID is an error: refresh the worklist instead of assuming it was fixed.

```bash
renaiss-shipflow pr reviews <n> --json    # read-only query (like pr ready): parse blocking/unresolvedThreads — rc is not the signal
renaiss-shipflow pr reviews <n> --thread <id> --full --json # complete first finding; one or several selected IDs
gh pr view <n> --json comments,reviews,statusCheckRollup,headRefName # general discussion, verdicts, CI, branch — one read
```

`bodyTruncated: true` means omitted text, not a complete finding. `--full`
returns the first comment of each selected thread, not its reply history.
If a finding references a reply or the discussion may already address it,
read the inline conversation with
`gh api --paginate repos/<owner>/<repo>/pulls/<n>/comments` and filter to that
finding's reply chain before deciding. Do not routinely dump every inline
comment as well as the focused finding bodies. Reuse the current packet's
CI/branch facts during the same review; refresh after a push or state change.

## 2. Triage each comment (from someone other than you)

- **Actionable & clear** → fix.
- **Needs clarification** → ask in a reply; don't guess.
- **Won't fix / disagree** → reply with a brief reason; never silently ignore.
- **Already addressed / stale** → skip (don't re-reply).

## 3. Fix

Skip `gh pr checkout <n>` on the reconcile path (already on the branch).
Otherwise check it out. **Then, before any commit:**
`base=$(git rev-parse HEAD)`. Reconcile workers already captured this at
worktree add (`loop-worker.md`) — reuse that `$base`; never recapture
after commits (that empties `$base..HEAD`, and an unset `$base` makes
`git log ..HEAD` list the whole branch). Fix **all** actionable comments
together, run tests + browser check (loop step 5), commit via the
**`shipflow:smart-commit`** skill (message-style.md § "Commit messages":
no AI-attribution trailer, skip the human-confirm gate). **Before push:**
`gh pr view <n> --json state,mergedAt`. If `MERGED` or `CLOSED`, do not
push the closed head. Then, and only then, park leftovers and file a
follow-up — **gated on leftover commits actually existing**:
`git log --oneline $base..HEAD` (the head recorded before any commit)
must be non-empty. Step 2's "Already addressed / stale → skip" leaves it
empty, and an empty follow-up describes nothing — file nothing, remove
the worktree, return. Non-empty →
`git push origin HEAD:refs/heads/fix/pr-<n>-leftover`, then
`renaiss-shipflow issue create --json`, body per the issue-body ladder
(`message-style.md`), evidence table citing the leftover branch and each
leftover SHA, one acceptance-checklist line per leftover commit, and
**exit 12 is a duplicate, not a failure** — read `{blocked: true,
candidates}` and either comment on the candidate or re-file with
`--allow-duplicate`. Full contract: loop-worker.md § "Merged mid-fix".
Otherwise (open PR) push.

## 4. Reply on the PR — necessary comments only

One consolidated comment — resolution table, then any question as its own line
with a recommendation:

  ```
  | # | Comment | Change | ✓ |
  | --- | --- | --- | --- |
  | 1 | <comment, ≤10 words> | <what changed, `path:line`> | ✅ |
  | 2 | <comment> | <change — or why not, ≤10 words> | ❌ won't fix |

  Q: <thing> — **Recommendation:** <answer>. Your call.
  ```

Inline-thread reply:
`gh api repos/<owner>/<repo>/pulls/<n>/comments/<comment_id>/replies -f body="…"`.
Fixed CI → one row (what failed, how fixed). No "done"-only comments — signal,
not noise.

## 5. Comment on the linked issue when relevant

Scope/behavior changed, or the reporter should know →
`gh issue comment <n> --body "Heads-up from review: …"`. Otherwise skip.

## 6. Resolve the threads you addressed

`renaiss-shipflow pr resolve <n> --thread <id>` (ids from step 1) so the
thread stops blocking approval/merge. Only resolve threads you actually
addressed.

## 7. Hand back for re-review

Pushing re-triggers push-run reviewers; for a specific human,
`gh pr edit <n> --add-reviewer <login>`. The loop reviewer won't approve (and
`pr automerge` won't merge) while any thread is unresolved. Never
`gh pr merge` — merging needs explicit human confirmation.

## Message style — everything you write on GitHub

Everything written on GitHub (comments, PR bodies, issue bodies) follows the
**Message style** contract — `message-style.md`; don't restate
it here.
