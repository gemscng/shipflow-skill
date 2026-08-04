# Agentic conflict resolution (#393)

The loop is a coding agent — a merge conflict is work, not a dead end.
Escalate only per the criteria at the bottom. (Proven live: ApeironDuels#93,
579/579 green.)

## Protocol

1. **Enter with state kept**: on the PR's checked-out branch run
   `renaiss-shipflow pr sync <n> --keep-conflicts --json`. Exit 6 leaves the
   rebase MID-FLIGHT and lists `conflictedFiles[]`. Plain `pr sync` still
   aborts — never leave a half-rebase behind unless about to resolve it.
2. **Resolve by intent, never by side**: read BOTH sides of each conflicted
   file before touching a hunk — `git log --oneline <base>..HEAD -- <file>`
   (the PR's intent) vs the upstream commits (main's). Usually keep both:
   - Both sides claim the same identifier/slot/version → **renumber, don't
     pick** (the PR's bump moves one past upstream's; migrations/validators/
     tests follow).
   - Upstream changed a value the PR copied ("mirror" constants, duplicated
     loops, golden fixtures) → update the PR's copy to the new upstream value.
   - Pure overlap (same line, unrelated edits) → merge the texts.
3. **Stage only what you resolved, then gate on markers**:
   `git add -- <file>…` — **never `git add -A` here**: it clears the UNMERGED
   index state that makes git refuse to commit a file still containing
   `<<<<<<<`. Printed paths are **repo-root-relative** — from a subdirectory
   use `git -C <repo-root> add -- <file>…` (what `pr sync --keep-conflicts`
   and the `conflict-check` gate print). Then, before every
   `git rebase --continue`:

   ```bash
   renaiss-shipflow pr conflict-check --base origin/<base>   # exit 8 = unmerged paths or markers remain
   git rebase --continue                                     # only on exit 0; repeat per commit
   ```

   Pass `--base` (same form as step 5 — `pr sync --keep-conflicts` prints it):
   a base-less check scans zero files once a `--continue` has **committed**
   markers. The gate self-resolves a base (the rebase's `onto`, else
   `origin/HEAD`) and reports `indeterminate` — exit 8, never a clean 0 —
   when it can resolve none (#412).

   Never `--skip` a commit — it silently drops the PR's own work.
4. **Mechanical resolution is NOT done — run the tests**, then hunt the
   semantic drift the rebase let in: `grep` the old literal across src + tests
   for anything renumbered/renamed; if the PR duplicates or mirrors logic
   upstream changed, diff upstream's changes to the mirrored module since the
   merge-base and re-mirror. A fidelity/tripwire test failing here is the
   suite doing its job — fix the mirror, not the test.
5. **Gate, then push**: `renaiss-shipflow pr conflict-check --base origin/<base>`
   clean **and** full test suite green → `git push --force-with-lease` (never
   plain force). `pr sync` runs the same marker scan and refuses to push
   (exit 8) if anything survives — no PR-triggered CI covers
   `apps/renaissshipflow-cli/**` or `skills/**` (#404); this gate is the
   backstop. Comment the resolution on the PR (what conflicted, what was
   renumbered/re-mirrored, the test count). The reviewer gate re-runs after
   any push and stays the merge gate.
6. **Abort cleanly when giving up**: `git rebase --abort` so the branch is
   exactly as found, then escalate. **Never end a turn mid-rebase** — the loop
   reuses ONE worktree; an abandoned rebase strands it on a detached HEAD.
   `pr sync` detects that at entry and refuses with the recovery command, but
   recovery costs a tick — abort before you hand back.

## PRs you don't own (the repo-wide sweep) — OPT-IN, trusted heads only

Resolving someone else's PR means **checking out their branch and running its
test suite** — executing that branch's code with the loop's ambient
credentials (gh write token, SSH keys, publish tokens). A `CONFLICTING` state
is *attacker-elected* (any PR can be made to conflict on demand), so "it
conflicts" never by itself admits a branch to the autonomous queue. Two gates
enforce that **in code**, before any checkout (#394):

| Gate | Default | Enforced at |
|---|---|---|
| The sweep exists at all — `renaiss-shipflow config set conflict-sweep true` (env `SHIPFLOW_CONFLICT_SWEEP`, or `inbox --conflict-sweep`) | **OFF** — an upgrade never turns it on | `foreignConflictedPRs()` returns `[]` |
| Head trust: same-repo head (`isCrossRepository: false`) **and** author association `OWNER`/`MEMBER`/`COLLABORATOR` | fail closed — unknown fields = untrusted | `headTrust()`, before the inbox row is built |

An untrusted head (fork, or a `CONTRIBUTOR`/`NONE` author) is still **listed**
in the inbox — `trustedHead: false`, `humanOnly: true`, `needsAttention: false`
— so a human sees it. **Never check one out**; one on the queue is a bug, not
an invitation — report it and move on.

For trusted heads, same protocol as your own, plus:

- **Never a draft** (the inbox already excludes them) — rebasing under the
  author destroys work in progress.
- **The PR comment is mandatory, not courtesy** — you rewrote their history
  (`--force-with-lease`); say exactly what moved and why.
- **A refused push is an escalation, not a retry** — abort the local rebase
  and escalate (that IS the "someone else's work" criterion); never retry
  with plain `--force`.
- The reviewer gate re-runs on ShipFlow-flow PRs; a human-only PR just gets
  the resolution + comment.

## Escalate instead (issue escalate, category by cause) when

- **Incompatible intent**: both sides changed the same behavior in ways that
  cannot both hold and the issue/PR bodies don't settle which wins — a
  product decision, not a merge.
- **Tests won't go green** within `max-fix-attempts` fix cycles — include
  failing test names + drift diagnosis in the escalation body.
- **The resolution would discard someone else's pushed work** (their commits
  on the same branch, or force-with-lease refused after a re-fetch).

Bound the attempt: one worker turn, not a background quest.
