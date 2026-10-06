---
name: smart-commit
description: "AI-powered git workflow assistant. Splits changes into atomic commits with Angular conventional messages, runs pre-commit checks (lint, format, test), and reports exactly what was committed. Use for: commit creation, atomic commit splitting, pre-commit validation, conventional commits."
---

# Smart Commit

> Adapted from [AIOTNetwork/AIOTAIAgentSkills](https://github.com/AIOTNetwork/AIOTAIAgentSkills) (MIT, (c) 2025 AIOT). See [LICENSE](LICENSE).

The user reviews commits after you make them, often later, from `git log`
alone. Every step below exists so they can see what went in, what was
left out, and what was checked, without re-reading the whole diff.

## Commit Message Format

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
header, with the body and trailer rules from git's
[SubmittingPatches](https://git-scm.com/docs/SubmittingPatches) and the
kernel's [Describe your changes](https://docs.kernel.org/process/submitting-patches.html#describe-your-changes):

```
<type>(<scope>)[!]: <subject>

<body>

<trailers>
```

| Type       | Use When                                        |
| ---------- | ----------------------------------------------- |
| `feat`     | New user-facing capability                      |
| `fix`      | Bug fix                                         |
| `perf`     | Performance improvement                         |
| `refactor` | Neither fix nor feature, no behavior change     |
| `docs`     | Documentation only                              |
| `test`     | Adding or correcting tests                      |
| `build`    | Build system or external dependencies           |
| `ci`       | CI configuration                                |
| `chore`    | Maintenance that touches no source or test code |
| `style`    | Formatting, whitespace, semicolons              |
| `revert`   | Reverts an earlier commit                       |

If the repo has a commitlint config or a CONTRIBUTING type list, use
that instead.

### Header

- Imperative mood: it completes "If applied, this commit will …".
  `add`, not `added` or `adds`.
- Lowercase first word after the colon, no trailing period.
- Subject aim ≤50 chars, hard limit 72 for the whole header.
- Scope is a noun for the affected area: `auth`, `cli`, `api`.
- Say what changed for the user, not which function you edited.
- Breaking change: add `!` before the colon and a `BREAKING CHANGE:`
  trailer that says what callers must do.

### Body

Required unless the subject says everything (a typo, a one-line config
change). The reader has `git log` and the diff, nothing else.

Write `- ` bullets, one fact per bullet, wrapped at 72 chars with
continuation lines indented two spaces. In this order, skipping any
that don't apply:

1. **Problem** — what was wrong or missing, in present tense. The bug,
   its user-visible effect, or the request. This bullet is required.
2. **Change** — what this commit does about it, in behavior terms.
3. **Why this way** — the approach chosen, and alternatives rejected
   when a reviewer would ask about them.
4. **Surprises** — anything the subject hides: a changed default, a
   removed code path, a migration, an existing test that was changed,
   a measured perf number.

Rules:

- Do not restate the diff. File lists, renamed variables, and "update
  X in Y" belong to `git show`, not the message.
- No "this commit", "this patch", or "I changed". Describe the code.
- Self-contained: summarize the issue or discussion in one line; a
  link or `#123` alone is not an explanation.
- Plain and short. Most bodies are 2–4 bullets. If it needs more than
  six, the commit probably needs splitting.

### Trailers

Last block, after one blank line, one `Token: value` per line, no blank
lines between them:

- `Closes #123` / `Fixes #123` — GitHub closes the issue when the
  commit reaches the default branch. Use `Refs #123` to link without
  closing.
- `BREAKING CHANGE: <what callers must change>` (uppercase).
- **Attribution:** add an `Assisted-by` trailer as the last line naming
  the model and the tool that wrote the commit, so `git log` shows which
  AI made it:
  `Assisted-by: <model name> (<tool>)`, e.g.
  `Assisted-by: Claude Opus 5.5 (Claude Code)` or
  `Assisted-by: GPT-5 (Codex CLI)`.
  - Use your actual model name and tool. If you don't know one, write
    what you know; never guess a version.
  - Do not add `Co-Authored-By` for the AI, even when the harness
    suggests one: GitHub renders it as a co-author avatar on the commit.
    Use it only when the repo's own docs require it.
  - Omit attribution when the repo or the caller says no AI attribution
    (the ShipFlow loop does).

### Example

```
fix(auth): refresh token before it expires

- Sessions drop mid-request when the token expires between the
  validity check and the API call (#341)
- Refresh now runs when under 60s of validity remain
- Chose a fixed 60s margin over retry-on-401: a retry would replay
  non-idempotent POSTs
- Changes the expiry assertion in auth.test.ts from 0s to 60s

Fixes #341
Assisted-by: Claude Opus 5.5 (Claude Code)
```

**Type matters beyond style.** Some repos derive the release from it
(e.g., `feat` → minor bump, anything else → patch). Pick `feat` only for
new user-facing capability.

## Core Principles

1. **One feature per commit** — each commit does ONE thing
2. **Small and focused** — if you can split it, split it
3. **Independent commits** — each should build and work on its own
4. **Logical ordering** — dependencies come before dependents
5. **Commit only what was asked** — changes you did not make, or that
   the user did not ask to commit, stay out and are listed as left out

Split when: new construct, modification, config change, docs, refactor, bug fix, or test.
A regression test may ride with the fix it covers.

## Workflow: Auto-Commit

### Step 1: Analyze

```bash
git status --short
git diff --stat            # unstaged
git diff --cached --stat   # already staged
git diff; git diff --cached
```

Look at staged, unstaged, and untracked files together. Decide which
changes belong to the request:

- Changes you made in this session, or that the user named → in scope.
- Changes that were already there, or unrelated to the request → left
  out. Do not stage them. If something was already staged and looks
  unrelated, say so in the plan instead of committing it silently.

If nothing is in scope, say so and stop.

### Step 2: Categorize and Split

Group in-scope changes into: new constructs, modifications, configuration,
documentation, refactoring, bug fixes, tests. Each group becomes a
separate commit. When one file mixes concerns, split it by hunk (see
[references/edge-cases.md](references/edge-cases.md)).

### Step 3: Run Pre-Commit Checks

Run the repo's lint, format, and test checks for the packages the
commits touch (see [references/precommit.md](references/precommit.md)).
Record each command and its exit code for the plan and the report. A
failing check blocks the commit unless the user says to commit anyway.

### Step 4: Present Plan

Show the plan in this shape. Every commit shows its full message, and
every file shows its line counts and one line on what changed in it:

```
## Commit plan — 2 commits on feat/profile

Commit 1/2  feat(api): add user profile endpoint
  files   src/api/profile.ts    +84 −0   GET /profile handler
          src/routes/index.ts    +2 −0   registers the route
  body    - Settings page needs the signed-in user's profile (#212)
          - Adds GET /profile returning name, email, and avatar URL

Commit 2/2  test(api): cover profile endpoint
  files   tests/api/profile.test.ts  +41 −0  200, 401, and missing-avatar cases
  body    (none — subject covers it)

Checks    npm run lint exit 0 · npm test -- api exit 0 (38 passed)
Left out  scripts/local-seed.sh   modified before this session, unrelated
Flags     none

Commit these 2? (yes / edit / cancel)
```

Put these under **Flags** when present, one line each:

- An existing test's assertions changed (not only new tests added)
- A possibly sensitive file (see edge cases)
- A lockfile, generated file, or binary
- A file over ~500 changed lines
- A skipped or failing check

Wait for confirmation before executing. Skip the wait only when the user
already said to commit without asking, or when no human is present
(headless or spawned agent runs): then execute the plan and still print
the plan and the report.

### Step 5: Execute

For each commit, in order:

```bash
git add -- <path> <path>                  # explicit paths only
printf '%s\n' "<full message>" > <tmp>/msg.txt
git commit -F <tmp>/msg.txt
```

- Stage explicit paths. Never `git add .` or `git add -A`.
- Write the message to a temp file and use `git commit -F`. It avoids
  shell quoting problems and works where heredocs are blocked.
- Never `--no-verify`, `--amend`, or `--force` unless the user asked.
- If a commit hook fails, the commit did not happen. Fix the cause,
  re-stage, and create the commit again. Do not amend the previous
  commit.

### Step 6: Report

After the last commit, print a report built from git's own output, not
from the plan, so it shows what actually landed:

```bash
git log --format='%h %s' -n <N>
git show --stat --format='' <hash>        # per commit
git status --short
git rev-list --left-right --count @{upstream}...HEAD 2>/dev/null
```

```
## Committed — 2 commits on feat/profile (not pushed; 2 ahead of origin)

a1b2c3d  feat(api): add user profile endpoint     2 files  +86 −0
e4f5a6b  test(api): cover profile endpoint        1 file   +41 −0

Checks     npm run lint exit 0 · npm test -- api exit 0 (38 passed)
Left out   scripts/local-seed.sh (still modified, not committed)
Inspect    git show a1b2c3d
Undo       git reset --soft HEAD~2   (keeps the changes, removes the commits)
```

If the working tree still has changes, list them under **Left out** with
the reason. If a commit failed or was skipped, say which and why.

## Workflow: Review & Suggest Splits

When asked only to review or suggest, run Steps 1–3 and print the Step 4
plan without executing. Add the exact `git add` / `git commit -F`
commands per commit so the user can run them.

## Edge Cases & Examples

See [references/edge-cases.md](references/edge-cases.md) for handling: no changes in scope, single file with multiple concerns, merge conflicts, uncommitted dependencies, sensitive files, WIP code, and commit examples.

## Critical Warnings

- **NEVER** run `git push --force` without explicit confirmation
- **NEVER** commit files containing secrets or credentials
- **NEVER** commit changes outside the request without saying so
- **ALWAYS** check for merge conflicts before committing
