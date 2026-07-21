# Resolving PR review feedback (loop reconcile, step 1)

For each open PR the loop authored that needs attention, work through **every**
reviewer comment, fix what you can, and reply so reviewers (human and automated,
e.g. gemini-code-assist) know what happened. Only act on **your own** PRs.

## 1. Gather every comment — don't miss inline ones

Start with `renaiss-shipflow pr reviews <n> --json` — it lists every **unresolved
review thread** (with its node-`id`, author, path, and body), including async bot
reviewers. Those threads are what block approval/merge, so they're the worklist.
`gh pr view <n> --comments` shows general comments + review summaries but **not**
line-level inline comments — fetch those too:

```bash
renaiss-shipflow pr reviews <n> --json                      # unresolved threads (the worklist)
gh pr view <n> --comments                                   # general + review bodies
gh pr view <n> --json reviews,statusCheckRollup,headRefName # verdicts + CI + branch
gh pr checks <n>                                            # CI status
# inline (code-line) review comments:
gh api repos/<owner>/<repo>/pulls/<n>/comments \
  --jq '.[] | "\(.path):\(.line) [@\(.user.login)] \(.body)"'
```

## 2. Triage each comment (from someone other than you)

- **Actionable & clear** → fix it.
- **Needs clarification** → ask in a reply; don't guess.
- **Won't fix / disagree** → reply with a brief reason; never silently ignore.
- **Already addressed / stale** → skip (don't re-reply).

## 3. Fix

Check out the PR's branch (`gh pr checkout <n>` or `git checkout <headRefName>`),
make the changes for **all** actionable comments together, run the project's tests
and the browser check (loop step 5), commit by **invoking the `smart-commit`
skill** (per loop-mode.md § "Commit messages" — no AI-attribution trailer, skip
the human-confirm gate), and push.

## 4. Reply on the PR — necessary comments only

- Post **one consolidated comment**: a resolution table the reviewer judges in
  one glance — one row per comment addressed, then any question as its own line
  with a recommendation:

  ```
  | # | Comment | Change | ✓ |
  | --- | --- | --- | --- |
  | 1 | <comment, ≤10 words> | <what changed, `path:line`> | ✅ |
  | 2 | <comment> | <change — or why not, ≤10 words> | ❌ won't fix |

  Q: <thing> — **Recommendation:** <answer>. Your call.
  ```
- To answer a specific inline thread, reply to it directly:
  `gh api repos/<owner>/<repo>/pulls/<n>/comments/<comment_id>/replies -f body="…"`
- If you fixed CI, say what was failing and how you fixed it (one row in the table).
- Don't comment just to say "done" — keep it signal, not noise.

## 5. Comment on the linked issue when relevant

If the feedback changes scope/behavior or the reporter should know, add a short
note on the issue the PR closes:
`gh issue comment <n> --body "Heads-up from review: …"`. Otherwise skip.

## 6. Resolve the threads you addressed

Once a thread's comment is fixed (and replied to), mark it resolved so it stops
blocking approval/merge: `renaiss-shipflow pr resolve <n> --thread <id>` (ids from
step 1's `pr reviews --json`). Only resolve threads you actually addressed.

## 7. Hand back for re-review

Pushing re-triggers reviewers that run on push. If a specific human review is
needed, `gh pr edit <n> --add-reviewer <login>`. The loop reviewer won't approve
(and `pr automerge` won't merge) while any thread is unresolved. Never `gh pr
merge` — merging needs explicit human confirmation.

## Message style — everything you write on GitHub

Everything you write on GitHub (comments, PR bodies, issue bodies) follows the one
**Message style** contract — graphical-first (tables / mermaid / checklists /
meters before bullets, ≤12 words/bullet), plus the PR-body and issue-body
templates — in `loop-mode.md` § "Message style". Don't restate it here.
