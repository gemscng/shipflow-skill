## ShipFlow issue tracking: track every non-trivial fix or feature

In a repo ShipFlow tracks, before making code edits for a bug fix or feature:

1. **Skip trivial edits** — typos, copy/wording, comments, formatting, lockfile-only tweaks, and read-only questions need no issue (even in `auto` mode).
2. **Issue already named (`#N`) or on an issue branch** — claim it first with `renaiss-shipflow issue work <N> --json`. Exit 3 means another agent or teammate already holds it: stop and tell the user before editing.
3. **No issue yet** — run `renaiss-shipflow issue match "<concise summary>" --json` (returns top open matches, active claims, and `issueTrack`: `auto` | `ask` | `off`). If the repo is not tracked or not signed in, skip the rest of this section silently.
4. **Match found** — under `auto`, claim it with `renaiss-shipflow issue work <N> --json` and note `Tracking under #N` in one line; under `ask`, confirm before claiming. Under `off`, skip.
5. **No match** — under `auto`, file and claim atomically with `renaiss-shipflow issue create --claim --lint=strict --title "<outcome>" --body "<body with Business flow>"` (bug fixes need no UI proposal; keep concise under 120 words with Business flow, Repro/Expected/Actual, and acceptance checkbox) and note the issue link in one line. Under `ask`, propose the title and ask first. Exit 12 means a duplicate exists — claim that match instead.
6. **Ship linked** — never run bare `gh pr create`; open PRs with `renaiss-shipflow pr create --json --lint=strict --issue <N>` (or auto-detected from branch/tracked config; pass `--no-issue` only for trivial/chore PRs), then attach proof with `renaiss-shipflow issue evidence <N> --pr <P>` (for auth-walled UI, capture locally in dev mode with fake/fixture data and revert any temporary stub before committing — never ask the user to sign in).
7. **Opt out** — `renaiss-shipflow config set issue-track off` skips matching and filing. Only `SHIPFLOW_ISSUE_TRACK_HOOK=false` drops this rule and the `gh pr create` gate.
