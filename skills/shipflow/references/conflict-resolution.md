# Agentic conflict resolution (issue #393)

The loop is a coding agent — a merge conflict is work, not a dead end. Escalate
only when the criteria at the bottom hold. Proven live on ApeironDuels#93: a
mechanical rebase plus two semantic adaptations (save-version renumbering after
a colliding version bump; stale constant mirrors after an upstream retune),
finishing 579/579 green.

## Protocol

1. **Enter with state kept**: on the PR's checked-out branch run
   `renaiss-shipflow pr sync <n> --keep-conflicts --json`. Exit 6 leaves the
   rebase MID-FLIGHT and lists `conflictedFiles[]`. (Plain `pr sync` still
   aborts — never leave a half-rebase behind unless you are about to resolve it.)
2. **Resolve by intent, never by side**: for each conflicted file, read BOTH
   sides before touching a hunk — `git log --oneline <base>..HEAD -- <file>` for
   what the PR meant, the upstream commits for what main meant. The right
   resolution usually keeps both intents, not one side verbatim:
   - Both sides claim the same identifier/slot/version → **renumber, don't pick**
     (e.g. both bumped a save/schema version: upstream keeps its number, the PR's
     bump moves one past it, migrations/validators/tests follow).
   - Upstream changed a value the PR copied ("mirror" constants, duplicated
     loops, golden fixtures) → update the PR's copy to the new upstream value.
   - Pure overlap (same line, unrelated edits) → merge the texts.
3. **Stage only what you resolved, then gate on markers**:
   `git add -- <file>…` — **never `git add -A` here.** The UNMERGED index state
   is the only thing making git refuse to commit a file that still contains
   `<<<<<<<`, and `add -A` clears exactly that. The paths the gate prints are
   **repo-root-relative**, so from a subdirectory use the anchored form
   `git -C <repo-root> add -- <file>…` — which is exactly what `pr sync
   --keep-conflicts` and the `conflict-check` gate now print for you. Then, before
   every `git rebase --continue`:

   ```bash
   renaiss-shipflow pr conflict-check --base origin/<base>   # exit 8 = unmerged paths or markers remain
   git rebase --continue                                     # only on exit 0; repeat per commit
   ```

   Pass `--base` (the same form as step 5 — it's what `pr sync --keep-conflicts`
   prints for you). Once a `git rebase --continue` has **committed** markers,
   nothing is unmerged and nothing differs from HEAD, so a base-less check has
   zero files to scan; the base is what makes it look at the branch's own
   changes. The gate now resolves one itself (the rebase's `onto`, else
   `origin/HEAD`) and reports `indeterminate` — exit 8, never a clean 0 — if it
   can resolve none and scanned nothing (issue #412).

   Never `--skip` a commit — a skipped commit silently drops the PR's own work.
4. **Mechanical resolution is NOT done — run the tests.** The conflicts git
   shows are the smallest part; hunt the semantic drift the rebase let in:
   - Sweep for stale references to anything you renumbered/renamed
     (`grep` the old literal across src + tests).
   - If the PR duplicates or mirrors logic upstream changed (a sim, a policy
     table, a fixture), diff upstream's changes to the mirrored module since the
     merge-base and re-mirror them. A fidelity/tripwire test failing here is the
     suite doing its job — fix the mirror, not the test.
5. **Gate, then push**: `renaiss-shipflow pr conflict-check --base origin/<base>`
   clean **and** full test suite green → `git push --force-with-lease` (never
   plain force). `pr sync` runs the same marker scan itself and refuses to push
   (exit 8) if anything survives — no PR-triggered CI covers
   `apps/renaissshipflow-cli/**` or `skills/**` (issue #404), so this gate is
   the backstop, not a formality. Then comment the resolution on the PR: what
   conflicted, what was renumbered/re-mirrored, the test count. The reviewer
   gate re-runs after any push — that stays the merge gate, not this protocol.
6. **Abort cleanly when giving up**: `git rebase --abort` so the branch is
   exactly as found, then escalate. **Never end a turn mid-rebase**: the loop
   reuses ONE worktree, and an abandoned rebase strands it on a detached HEAD
   where every later git op fails. `pr sync` now detects that state at entry and
   refuses with the recovery command instead of a misleading branch mismatch —
   but recovering costs a tick, so abort before you hand back.

## PRs you don't own (the repo-wide sweep) — OPT-IN, trusted heads only

Resolving someone else's PR means **checking out their branch and running its
test suite** — which executes that branch's code (`pretest`/`postinstall`,
test-runner config, a new test file) in the operator's shell with the loop's
ambient credentials: the `gh` write token, SSH keys, publish tokens. A
`CONFLICTING` state is *attacker-elected* — touching one line the base also
moved makes any PR conflict on demand — so "it conflicts" can never by itself
admit a branch to the autonomous queue. Two gates enforce that **in code**,
before any checkout (PR #394 review); neither is an honour-system caveat:

| Gate | Default | Enforced at |
|---|---|---|
| The sweep exists at all — `renaiss-shipflow config set conflict-sweep true` (env `SHIPFLOW_CONFLICT_SWEEP`, or `inbox --conflict-sweep`) | **OFF** — an upgrade never turns it on | `foreignConflictedPRs()` returns `[]` |
| Head trust: same-repo head (`isCrossRepository: false`) **and** author association `OWNER`/`MEMBER`/`COLLABORATOR` | fail closed — unknown fields = untrusted | `headTrust()`, before the inbox row is built |

An untrusted head (fork, or a `CONTRIBUTOR`/`NONE` author) is still **listed**
in the inbox — `trustedHead: false`, `humanOnly: true`, `needsAttention: false`
— so a human sees it. **Never check one out.** If you find one on the queue,
report it and move on; that is a bug, not an invitation.

For the trusted heads the sweep does hand you, same protocol as your own, plus:

- **Never a draft** (the inbox already excludes them): a draft is the author's
  workbench; rebasing under them destroys work in progress.
- **The PR comment is mandatory, not courtesy**: you rewrote someone's branch
  history (`--force-with-lease`); the comment tells them exactly what moved and
  why, so their next `git pull --rebase` is no surprise.
- **A refused push is an escalation, not a retry**: abort the local rebase and
  escalate (that IS the "someone else's work" criterion), never retry with plain
  `--force`.
- The reviewer gate re-runs on ShipFlow-flow PRs as usual; a human-only PR just
  gets the resolution + comment.

## Escalate instead (issue escalate, category by cause) when

- **Incompatible intent**: both sides changed the same behavior in ways that
  cannot both hold and the issue/PR bodies don't settle which wins — that's a
  product decision, not a merge.
- **Tests won't go green** within `max-fix-attempts` fix cycles after
  resolution — include the failing test names and your drift diagnosis in the
  escalation body.
- **The resolution would discard someone else's pushed work** (their commits on
  the same branch, or force-with-lease is refused after a re-fetch).

Bound the attempt: this protocol is one worker turn, not a background quest.
