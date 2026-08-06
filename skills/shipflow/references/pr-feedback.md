# Resolving PR review feedback (loop reconcile, step 1)

Work through **every** reviewer comment (human and bot, e.g.
gemini-code-assist) on loop-authored PRs needing attention; fix what you can,
then reply via `renaiss-shipflow pr note <n> --body …` (#603 — the marked path; bare `gh pr comment` on a loop PR re-reads as a reporter correction, #477). Only act on **your own** PRs.

## 1. Gather every comment — don't miss inline ones

`pr reviews --json` is the worklist (unresolved threads block approval/merge);
`gh pr view --comments` misses line-level inline comments — fetch separately:

```bash
renaiss-shipflow pr reviews <n> --json    # unresolved threads (node-id, author, path, body) — the worklist
gh pr view <n> --comments                 # general + review bodies
gh pr view <n> --json reviews,statusCheckRollup,headRefName  # verdicts + CI + branch
gh pr checks <n>                          # CI status
# inline (code-line) review comments:
gh api repos/<owner>/<repo>/pulls/<n>/comments \
  --jq '.[] | "\(.path):\(.line) [@\(.user.login)] \(.body)"'
```

## 2. Triage each comment (from someone other than you)

- **Actionable & clear** → fix.
- **Needs clarification** → ask in a reply; don't guess.
- **Won't fix / disagree** → reply with a brief reason; never silently ignore.
- **Already addressed / stale** → skip (don't re-reply).

## 3. Fix

`gh pr checkout <n>`, fix **all** actionable comments together, run tests +
browser check (loop step 5), commit via the **`shipflow:smart-commit`** skill
(message-style.md § "Commit messages": no AI-attribution trailer, skip the
human-confirm gate), push.

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
