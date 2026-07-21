# Feature work without an issue — detect & relate

Run this when the user is doing feature/change work in a ShipFlow project that
isn't tied to an issue — e.g. they describe building something, start a feature
branch, or are about to open a PR with no `Fixes #N`. The aim: never let
substantial work land un-tracked, without creating duplicate issues.

## Steps

0. **Skip trivial changes — no issue needed.** If the work is small and subtle —
   a typo/copy/text edit, wording or label change, comment, formatting/whitespace,
   a tiny cosmetic tweak, a version bump or lockfile update — just make it and
   move on. Do **not** detect, ask, or create an issue, **even in auto mode**.
   Only run the rest of this flow for substantive feature/behavior/bug work that's
   worth tracking. When unsure, lean trivial for one-liners; lean track-it for
   anything touching logic, data, or user-facing behavior.
1. **Summarize the work** in a sentence or two — from the user's description, the
   branch name, and/or `git diff` / recent commits. That intent is the query.
2. **List candidates:** `renaiss-shipflow issues list --json`.
3. **Match (you do this — it's semantic).** Compare the work against each open
   issue's title + body. Be conservative: only call it a match when the work
   plainly implements or fixes that issue.
   - **Match →** tell the user: "This looks covered by **#N — <title>**. Work
     under it?" If yes, `renaiss-shipflow issue work N`. Do **not** open a
     duplicate.
4. **No match →** check the auto-issue setting:
   `renaiss-shipflow config get auto-issue --json`.
   - **`autoIssue: true`** → create one automatically:
     `renaiss-shipflow issue create --title "<concise>" --body "<what + why>"`,
     report which issue you opened, and continue — **don't ask**.
   - **`autoIssue: false`** (default) → **ask** first: "No open issue covers this
     — want me to open one? (proposed title: …)". Create only on a yes.
5. Once linked (matched or created), reference it in the PR body (`Fixes #N`).

## Auto mode

The user enables auto-create with:

```
renaiss-shipflow config set auto-issue true     # or env SHIPFLOW_AUTO_ISSUE=true
```

With it on, step 4 never prompts — it opens the issue and proceeds. Turn off with
`renaiss-shipflow config set auto-issue false`.
