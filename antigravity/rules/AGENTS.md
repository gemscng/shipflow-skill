## ShipFlow feature map: read it before changing code

In a repo ShipFlow tracks, before changing code:

1. Run `renaiss-shipflow features --json` (or `--category <area>`). If it errors, the repo is not in ShipFlow: skip the rest of this section.
2. Find the features whose `paths` cover the files you will change, and read their `test_priority` and `test_cases`. Neighbours are other features that list the same files; `coChangeMatrix` shows files that usually change together.
3. Stay inside those features' paths. If you change a neighbouring feature's files, name that feature in the PR.
4. Empty map (no features, or `degraded: ["empty-map"]`): run `renaiss-shipflow features generate --json` once, then repeat step 1.

## ShipFlow issue tracking: track every non-trivial fix or feature

In a repo ShipFlow tracks, before making code edits for a bug fix or feature:

1. **Skip trivial edits** — typos, copy/wording, comments, formatting, lockfile-only tweaks, and read-only questions need no issue (even in `auto` mode).
2. **Issue already named (`#N`) or on an issue branch** — claim it first with `renaiss-shipflow issue work <N> --json`. Exit 3 means another agent or teammate already holds it: stop and tell the user before editing.
3. **No issue yet** — run `renaiss-shipflow issue match "<concise summary>" --json` (returns top open issue matches, `relatedPrs`, active claims, and `issueTrack`: `auto` | `ask` | `off`). If an open PR already covers the same work (`relatedPrs` or `renaiss-shipflow pr match "<summary>" --json`), check it before duplicating work. If the repo is not tracked or not signed in, skip the rest of this section silently.
4. **Match found** — under `auto`, claim it with `renaiss-shipflow issue work <N> --json` and note `Tracking under #N` in one line; under `ask`, confirm before claiming. Under `off`, skip.
5. **No match** — under `auto`, file and claim atomically with `renaiss-shipflow issue create --claim --lint=strict --title "<outcome>" --body "<body with Business flow>"` (bug fixes need no UI proposal; keep concise under 120 words with Business flow, Repro/Expected/Actual, and acceptance checkbox) and note the issue link in one line. Under `ask`, propose the title and ask first. Exit 12 means a duplicate exists — claim that match instead.
6. **Ship linked** — never run bare `gh pr create`; open PRs with `renaiss-shipflow pr create --json --lint=strict --issue <N>` (or auto-detected from branch/tracked config or auto-related from open issues when `auto-relate-pr` is on — `--no-auto-relate` disables it; pass `--no-issue` only for trivial/chore PRs; existing unlinked PRs can be linked via `renaiss-shipflow pr relate <P> --apply`), then attach proof with `renaiss-shipflow issue evidence <N> --pr <P>` covering **all possible states added, deleted, and updated in the current code changes** (one labeled before/after pair per state for UI diffs, or test summary for non-UI diffs; for auth-walled UI, capture locally in dev mode with fake/fixture data and revert any temporary stub before committing — never ask the user to sign in).
7. **Opt out** — `renaiss-shipflow config set issue-track off` skips matching and filing. Only `SHIPFLOW_ISSUE_TRACK_HOOK=false` drops this rule and the `gh pr create` gate.

## ShipFlow commits: use smart-commit (not bare git commit)

When you are about to create a git commit:

1. Do **not** run a bare `git commit` / `git commit -m …` from the shell.
2. Invoke the bundled skill **`shipflow:smart-commit`** (Skill tool, plugin-qualified — #544). No Skill tool / plugin namespace → Codex: `$smart-commit`; Cursor: read and follow `skills/smart-commit/SKILL.md` from the same resolved skill root as ShipFlow (never a bare name, never a loop worktree copy). See `references/message-style.md` § "Commit messages".
3. When executing that skill's plan, prefix each commit shell with the allow marker so the plugin PreToolUse gate lets it through: `SHIPFLOW_SMART_COMMIT=1 git commit …` (same for amend). In the ShipFlow loop only (no human present): no AI-attribution trailer, and skip the human-confirm gate (`message-style.md` § "Commit messages"). In a session with a person, the skill's defaults apply: its `Assisted-by` trailer, and the plan shown for confirmation before committing.
4. Opt out of the gate/hint: `SHIPFLOW_SMART_COMMIT_HOOK=false`.
