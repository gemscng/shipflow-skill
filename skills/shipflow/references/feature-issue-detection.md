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
2. **List candidates:** `renaiss-shipflow issues list --json --limit 1000`.
   **Not the default `--limit 30`** — that is a newest-first slice which
   structurally cannot contain an older duplicate, which is how #579 restated
   #427 three days later (issue #580).
3. **Match (you do this — it's semantic).** Compare the work against each open
   issue's title + body. Be conservative: only call it a match when the work
   plainly implements or fixes that issue.
   - **Match →** tell the user: "This looks covered by **#N — <title>**. Work
     under it?" If yes, `renaiss-shipflow issue work N`. Do **not** open a
     duplicate.
4. **No match →** check the auto-issue setting:
   `renaiss-shipflow config get auto-issue --json`.
   - **`autoIssue: true`** → create one automatically:
     `renaiss-shipflow issue create --title "<concise>" --body "<ladder body>"`,
     report which issue you opened, and continue — **don't ask**.
   - **`autoIssue: false`** (default) → **ask** first: "No open issue covers this
     — want me to open one? (proposed title: …)". Create only on a yes.
   - **Either way, `issue create` may exit 12** — its own near-verbatim
     duplicate guard found an open issue that restates your title, and created
     nothing (issue #580). Treat that as a step-3 **Match**, not a failure:
     surface the candidates it printed and offer `issue work <n>`, or re-run
     with `--allow-duplicate` when the work is genuinely separate. The guard
     catches restatements only — your semantic step-3 pass is still the check
     that catches paraphrases.

   Either way the body follows the **issue-body ladder**
   (`loop-mode.md` § "Message style"; demo: issue #387): status-header
   blockquote first line (priority emoji · type · area · effort · source —
   here `auto-issue`), then **Why** + **What** (≤3 bullets each), an evidence
   table for any `file:line` claim, and always an acceptance checklist;
   mermaid only when the design has a flow/sequence/state shape, long detail
   folded into `<details>`.
5. Once linked (matched or created), reference it in the PR body (`Fixes #N`).

## Auto mode

The user enables auto-create with:

```
renaiss-shipflow config set auto-issue true     # or env SHIPFLOW_AUTO_ISSUE=true
```

With it on, step 4 never prompts — it opens the issue and proceeds. Turn off with
`renaiss-shipflow config set auto-issue false`.
