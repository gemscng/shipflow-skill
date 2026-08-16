# Feature work without an issue — detect & relate

Run this when the user is doing feature/change work in a ShipFlow project with
no tied issue — they describe building something, start a feature branch, or
are about to open a PR with no `Fixes #N`. Never let substantial work land
un-tracked; never create duplicate issues.

## Steps

0. **Skip trivial changes — no issue needed.** A typo/copy/text edit, wording
   or label change, comment, formatting/whitespace, tiny cosmetic tweak,
   version bump, or lockfile update: just make it — do **not** detect, ask,
   or create an issue, **even in auto mode**. Run the rest only for
   substantive feature/behavior/bug work worth tracking. When unsure: lean
   trivial for one-liners; lean track-it for anything touching logic, data,
   or user-facing behavior.
1. **Summarize the work** in a sentence or two (the user's description, the
   branch name, and/or `git diff` / recent commits) — that intent is the query.
2. **List candidates:** `renaiss-shipflow issues list --json --limit 1000`.
   **Not the default `--limit 30`** — a newest-first slice structurally cannot
   contain an older duplicate (#580; the windowed-scan misses that let #579 re-file #427 are the measured case).
3. **Match (you do this — it's semantic).** Compare the work against each open
   issue's title + body; be conservative — only a match when the work plainly
   implements or fixes that issue.
   - **Match →** "This looks covered by **#N — <title>**. Work under it?" On
     yes: `renaiss-shipflow issue work N`. Do **not** open a duplicate.
4. **No match →** check `renaiss-shipflow config get auto-issue --json`.
   - **`autoIssue: true`** → create automatically:
     `renaiss-shipflow issue create --title "<concise>" --body "<ladder body>"`,
     report which issue you opened, and continue — **don't ask**.
   - **`autoIssue: false`** (default) → **ask** first: "No open issue covers
     this — want me to open one? (proposed title: …)". Create only on a yes.
   - **Either way, `issue create` may exit 12** — its near-verbatim duplicate
     guard found an open issue restating your title and created nothing
     (#580). Treat that as a step-3 **Match**, not a failure: surface the
     candidates it printed and offer `issue work <n>`, or re-run with
     `--allow-duplicate` when the work is genuinely separate. The guard
     catches restatements only — your semantic step-3 pass still catches
     paraphrases.

   The body follows the **issue-body ladder** (`message-style.md`; demos:
   #387 bug, #712 feature/task): status-header blockquote (priority emoji ·
   type · area · effort · source `auto-issue`), **Why** + **What** (≤3
   bullets each) + **Example** (one concrete scenario with real values) +
   **Expected result** (the observable outcome once it lands), an evidence
   table for any `file:line` claim, always an acceptance checklist; mermaid
   only for flow/sequence/state shapes, long detail in `<details>`.
5. Once linked (matched or created), reference it in the PR body (`Fixes #N`).

## Auto mode

Enable auto-create with:

```
renaiss-shipflow config set auto-issue true     # or env SHIPFLOW_AUTO_ISSUE=true
```

With it on, step 4 never prompts — it opens the issue and proceeds. Turn off
with `renaiss-shipflow config set auto-issue false`.
