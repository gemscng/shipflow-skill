# Loop worker subagent

One **worker** per work item, dispatched via the Task tool; it runs in its
**own context** and returns only a compact payload (see Return). **Default
(parallel, #744):** your own worktree — create it first, remove it last —
`.worktrees/shipflow-loop-<issue>` (fix) or
`.worktrees/shipflow-loop-pr-<n>` (reconcile), never the shared loop
worktree (`loop-mode.md` § Setup). Solo (`loop-concurrency 1` only): you
MAY run in the loop worktree.

**Scratch isolation (#683).** Workers run concurrently and the session
scratchpad is SHARED. Prefer composing scratch artifacts (PR body, scan
notes) inside your OWN worktree — untracked; check `git status` before
committing so none land in a commit. Anything written to the shared
scratchpad MUST be keyed to your item — `<scratchpad>/issue-<n>/…`
(reconcile: `<scratchpad>/pr-<n>/…`) — never a bare shared filename like
`<scratchpad>/pr-body.md`: the second writer wins silently and a PR can
publish another issue's body (measured, #683).

## Input the orchestrator passes
- `issue` number + `triage` payload (relatedFiles / relatedCommits / features)
- the reviewer's **acceptance brief** (what "done" means, features touched +
  to regression-check)
- repo, default branch, active policies (test/CI bar)

Pull the **feature map** yourself (step 2).

## Degraded inputs — read the ⚠️ markers, never work past them
Mirrors `loop-reviewer.md` § "Degradation discipline". Every ShipFlow command
marks inputs it failed to obtain in its own output (not only stderr):

| Marker (says what did NOT load) | Do |
|---|---|
| `⚠️ triage unavailable — ShipFlow context and relatedFiles NOT loaded` (`issue work`/`issue next`; `--json` `triageUnavailable: true`) | Re-run before using `triage.*`; empty ≠ "nothing related" |
| `⚠️ review threads UNAVAILABLE — unresolved count NOT determined` (`pr packet`; `--json` `reviewThreads.unresolved: null`) | **Not zero.** Re-run, or `renaiss-shipflow pr reviews <n>` |
| `⚠️ Brief NOT loaded — issue #N could not be read` (`pr packet`; `--json` `spec.unavailable: true`) | **Not "no brief".** Re-run, or `gh issue view <n>` |
| `⚠️ WARNING shipflow-api feature map unavailable … NOT checked` (`pr packet`; `--json` `degraded[]`) | Pull `features --json` before claiming neighbour coverage |

Missing marker = the check ran — never add one by hand. Present marker = never
a footnote — the reviewer treats any `degraded[]` entry or marker above as
`request_changes`. Scoped to these markers only — the packet's own
`⚠️ **No linked issue/brief found.**` (thin coverage) and two neutral `NOTE`
lines are not degradations:
`NOTE per-feature evidence coverage not applicable — no ShipFlow feature map covers <repo> (cross-repo --repo target)`
and `NOTE #N is not a readable issue in <repo> — no acceptance brief to load`
(`--json` `spec.notReadable: true`) — judge the stale link on its merits.

## What a fix worker does (one issue, end-to-end)
1. **Branch** — default: from the repo root, `git fetch origin &&
   git worktree add .worktrees/shipflow-loop-<n> -b fix/issue-<n>-<slug>
   origin/<default>`, then work in that worktree only. Solo
   (`loop-concurrency 1` only): `git checkout -b fix/issue-<n>-<slug>
   origin/<default>` in the loop worktree. Then
   `renaiss-shipflow git-identity --fix` **before the first commit** —
   unmatched author emails block deployments, and create refuses such
   branches.
2. **Map, then fix** — `renaiss-shipflow features --json` (or `--category
   <area>`): each feature's **file paths**, **test priority**, and
   **neighbours** sharing those paths. Empty-map / `degraded:["empty-map"]` →
   `renaiss-shipflow features generate --json`, then re-run. Stay inside your
   feature's paths; flag any neighbour touch for the reviewer. Investigate (brief +
   `triage.relatedFiles`) using full git history: `git log -p -- <file>`,
   `git blame`, `triage.relatedCommits`, `git log --since` / bisect for
   regressions. Make the change. Genuinely try to verify — start the dev
   server, seed a test DB; environmental friction is not grounds to abandon.
   **Data lives locally, never in prod:** reproduce and verify against the
   project's local DB (compose stack, seeded dev DB, fixtures). No local DB
   and the fix needs one → `issue escalate <n> --category missing-secret
   --reason "…"` asking the human to set one up; a prod write the fix depends on
   (backfill, seed, row repair) is the operator's step — your PR ships
   the script + dry-run, the escalation asks them to run it and paste the
   result. Never ask for, accept, or use a prod `DATABASE_URL` or secret
   (loop-mode.md § Guardrails).
3. **Test** — run the project's tests, then **verify end-to-end in a real
   browser** for any UI/behavior change (`references/browser-testing.md`:
   `bin/shipflow-browser --ensure` + `--import-if-needed` (do not raw-import),
   scope from diff + adjacent pages, drive
   the fix, `snapshot -D` + no new console errors, before/after
   **screenshots** Read, **score** affected + neighbour pages per
   `references/qa-report.md` — a dropped neighbour score = regression). Pure
   backend/library changes verify on tests alone.
   - Branch pass = *your branch* on the local dev server. PR has a **preview
     deploy**? Also `renaiss-shipflow regression --ref <head-sha>
     --preview-url <preview-url> --wait`, gate on exit code (`regression`
     takes no subcommand; only `regression status <executionId>`). The
     preview host must match the environment's `previewUrlPatterns` allowlist
     or the run fails loudly — have the operator add the pattern once, don't
     retry blindly. Preview URL: deploy-bot comment / GitHub deployment. No
     preview → skip; deployed-env regression stays in the Phase-C sweep and
     post-deploy gate.
4. **Regression test** — once the fix verifies, add ONE test that locks it in:
   trace the bug's codepath, match the project's test style (read 2–3 nearby
   test files), assert the *correct behavior* — not "it renders". Run just
   that file; commit it with the fix. Skip only for pure-CSS changes or no
   test framework (note it in the return).
   **Lock the criterion at the level it is stated.** The brief's `runners:`
   line (`loop-reviewer-intake.md` §5b) says what is available. A criterion
   stated per page or per route ("exactly one `<main>` on `/item`", "the
   redirect lands on `/verify`") is locked with the e2e runner when the
   brief lists one — a unit render of the child proves a proxy ("the child
   contributes zero"), not the criterion. A proxy is allowed only when no
   e2e runner exists or the e2e environment genuinely cannot run here, and
   then the Verified line says so: `proxy: jsdom render — no e2e runner`.
   Never claim the criterion is locked when the test locks the proxy (#2165
   in renaiss-os-index shipped a jsdom count while `@playwright/test` sat in
   `devDependencies`, because the intake said there was none).
   **Committed comments cite symbols, not line numbers.** `globals.css:488`
   in a test comment is wrong the week after it merges; `.shell in
   globals.css` is not. Line numbers belong in GitHub writes, which are
   dated (`message-style.md`).
5. **PR** — commit via Skill tool → **`shipflow:smart-commit`**
   (plugin-qualified — a bare name can resolve to another plugin's copy,
   #544; message-style.md § "Commit messages": no AI-attribution trailer, skip
   the human-confirm gate). Push, then
   `renaiss-shipflow pr create --json --lint=strict` — MANDATORY; never drop
   `--lint`. `lintMessageBody`
   (`apps/renaissshipflow-cli/src/message-lint.ts`) exits 2 on a rejected
   body — restructure and re-run. Never bump versions in the PR or state
   them in the body — auto-bump versions main after merge (#548).
   **Readable-body contract (#464)** — HEADLINE (un-collapsed) ≤ ~25 visible
   lines: TLDR (≤4 sentences — what/why/risk), "What changed" (≤3 bullets),
   one Verified line; everything else in `<details><summary><b>Section
   name</b> — one-line gist</summary>` blocks. Never folded: **Deviations
   from brief** and the `<!-- shipflow:interpretation -->` marker. Hard
   ceiling: 50 visible lines outside `<details>` (exit 2 under
   `--lint=strict`); write for ~25.
   **Full fix** → header links `Closes #N` (closes on merge; default).
   **Partial slice** → **`--partial`** → header links `Part of #N` (no
   closing keyword), parent stays open; don't hand-write `Part of #N` in
   `--body` — the header still injects its link, `--partial` switches it.
5b. **Deviations from brief — log them, don't bury them.** Off-brief pivot:
   take the conservative option, record it under a `## Deviations from brief`
   heading: `| Deviation | Why | Risk |`, one
   row each, cells ≤10 words (the reviewer verifies every row); keep going. A
   deviation only in a commit message is invisible to review. No deviations →
   no section. Any deviations section = automerge blocker (#190):
   `pr automerge`/`pr ready` refuse + apply `needs-reporter-review` — silence
   is not consent; clears on one reporter reply (or maintainer label
   removal). Genuine *reinterpretation* → 5d.
   **A brief claim you found false is an `intake correction:` row, never a
   silent fix.** When the brief asserts a repo fact and the repo disagrees
   (the brief said no `<main` under `app/api`, `grep` finds one; the brief
   said no e2e runner, `package.json` has one), add a row in the same table
   whose Deviation cell opens `intake correction:` and whose Why cell is the
   probe that disproved it: `grep -rn "<main" app/api → route.ts:62`. The
   reviewer re-runs every such probe (`loop-reviewer.md` §1); a correction
   that only lives in your head lets the same wrong claim reach the next
   worker. Count them in the return (`intakeCorrections`).
5c. **UI work: mock first.** For `category:ui` issues (or any change whose
   acceptance depends on how it LOOKS), slice 1 is a static mock — HTML page
   or screenshot with fake data — attached as evidence for reaction before
   behavior is wired.
5d. **Access-control ambiguity is a `security` escalation — don't guess, never
   ship a silent reinterpretation.** Unclear WHO SEES WHAT (permissions,
   roles, tenant/visibility scope, auth gating)? Never proceed-with-a-note —
   `renaiss-shipflow issue escalate <n> --category security --reason "..."` with a
   `**Recommendation:**` naming your default audience and why (a recommended
   answer is required, never an open question). Shipping a deliberate
   reinterpretation after a human proceed → the PR body MUST carry
   `<!-- shipflow:interpretation -->` (contract `markers.interpretationNote`),
   a deterministic automerge blocker (5b) forcing reporter confirmation;
   without it, the #236/#238 failure.
6. **Evidence** — `renaiss-shipflow issue evidence <n> --pr <pr>
   --before <s1-before.png> <s2-before.png> --after <s1-after.png> <s2-after.png>
   --label "<surface 1>" "<surface 2>"
   --caption "Verified: <what> · health <before>→<after> (Δ<+/-N>)"`.
   Pair/mix: `validateEvidenceSelection`
   (`apps/renaissshipflow-cli/src/evidence.ts`). Pass
   `--touched "<feature>"…` (features the diff touches): the gallery renders
   a red gap card for any touched feature lacking a proof pair.
   **One proof per touched feature** — the reviewer blocks multi-feature
   PRs with fewer proofs than touched features.
   **One claim per image** — a caption asserts only what its image shows;
   needs "and" → split into more labeled pairs.
   **Mark the change, don't cover it** — before each after-shot, outline the
   changed region: `outline: 3px solid #ff3b30; outline-offset: 3px`
   (`$BROWSE js '…'`, recipe in `references/browser-testing.md` §4, or the
   browser-service `screenshot` `highlight` param). The outline renders
   OUTSIDE the element; never opaque overlays, arrows, or boxes across the
   content.

Too risky / ambiguous / unreproducible / unverifiable → do **not** open a PR;
report `blocked` with the reason (the orchestrator will escalate).

## What a reconcile worker does (one PR)
**Worktree first.** Default (parallel, #744): from the repo root,
`git fetch origin && git worktree add .worktrees/shipflow-loop-pr-<n>
<pr-branch>` (the existing PR branch). If the local branch is missing,
`git worktree add -b <pr-branch> .worktrees/shipflow-loop-pr-<n>
origin/<pr-branch>`. Work only there. **Never** `git checkout` / `gh pr
checkout` into the shared loop worktree — Phase A fans independent PRs
and a shared checkout clobbers siblings. Skip `pr-feedback.md`'s `gh pr
checkout` (you are already on the branch). **Immediately after the
worktree exists, before any commit:** `base=$(git rev-parse HEAD)` —
this is the leftover range later (§ "Merged mid-fix"). Recording it at
push time is too late: unset `$base` makes `git log ..HEAD` list the
whole branch (the squash false-positive that section exists to prevent).
Recapture after a rebase of a still-open PR, still before further
commits — a pre-rebase SHA is not an ancestor of HEAD. Never recapture
after commits. Last act: `git worktree remove
.worktrees/shipflow-loop-pr-<n>` after push, or on `blocked`. Solo
(`loop-concurrency 1` only): checkout the PR branch in the loop worktree,
then the same `base=$(git rev-parse HEAD)` before any commit.

Then: one PR + the reason(s) from `inbox`: fix failing CI; or address
review comments (`references/pr-feedback.md`) and reply; or rebase a
moved base — `renaiss-shipflow pr sync <n>`, resolving conflicts
agentically via `--keep-conflicts` + `references/conflict-resolution.md`
(resolve by intent, test, force-with-lease, comment) instead of
escalating. Pull `features --json` when a fix risks touching more than
the PR's own feature. Push when done — **unless the PR already merged or
closed** (`gh pr view <n> --json state,mergedAt`). A `MERGED` / `CLOSED`
head is not a push target: park leftover commits on
`fix/pr-<n>-leftover` and file a follow-up issue (below), then remove this
worktree. Never keep pushing the closed head — that is how a fix sits on a
dead branch until someone re-files it. An immediate post-push `pr reviews`
zero is **not** a settled
measurement — external bots post 1–2 minutes later. automerge owns the 120s
settle wait; do not merge on that zero.

### Merged mid-fix → follow-up issue, but only if there is something to file

**1. Guard — leftover commits must actually exist.** Use the `$base`
recorded immediately after worktree add (above), before any commit — do
not recapture now. The leftover set is
`git log --oneline $base..HEAD` — exactly the commits you made after the
merged head, so exactly the ones the merge could not have carried.
**Empty → file NOTHING, just remove the worktree.** A reconcile legitimately
produces zero commits — `address_comments` whose comments were already
handled, `pr-feedback.md` step 2's "Already addressed / stale → skip" — and
one of those overlapping a merge would file an issue describing nothing:
noise worse than the gap it closes. Range against **your recorded base**,
never against `origin/<default>`: `pr automerge` squashes by default, so the
parent's own commits are not ancestors of the base and
`origin/<default>..HEAD` re-lists the whole branch — non-empty even when
nothing is left over.

**2. Park the leftovers.** Push them off the closed head so the SHAs
survive worktree removal:
`git push origin HEAD:refs/heads/fix/pr-<n>-leftover`
Never `git push` to the closed PR branch. Filing without this push
leaves unpushed leftover SHAs that 404 in the evidence table once the
worktree is gone.

**3. File it.** `renaiss-shipflow issue create --json`, body per the
**issue-body ladder** (`message-style.md`): status header sourcing
`Part of #<parent>`, an evidence table citing `#<pr>`,
`fix/pr-<n>-leftover`, and each leftover SHA,
and **one acceptance-checklist line per leftover commit** — that list is the
next reviewer's 1:1 coverage gate. Prose-only bodies fail the ladder the
intake reviewer grades against.

**4. Handle exit 12** — the same contract Phase B applies to every filing
(`loop-mode.md` § B). `issue create` files **NOTHING** on a near-duplicate
title and exits **12**: read `{blocked: true, candidates: […]}` off the
`--json` payload, then either comment the leftover commits onto the matching
candidate (linking `#<pr>`) or re-file with **`--allow-duplicate`** when it
is genuinely different. Never read 12 as "filed", never as a plain command
failure — a bare non-zero read as "the command broke" strands the leftover
commits on a dead branch, the exact silent drop this section exists to
prevent.

**5. Ownership — you are the only filer here.** `automerge` files nothing
post-merge (`loop-mode.md` § "Reconcile playbook", `approved_ready`), so one
late review yields one issue, not two.

## Before you return — self-verify
Your completion contract — don't return until each holds (or you genuinely
hit a wall):
- [ ] Tests pass + E2E browser check genuinely verified the fix (screenshots
      Read) — UI/behaviour changes.
- [ ] Regression test written, passing, committed (or noted why skipped).
- [ ] Stayed inside the feature's paths (or neighbour touch flagged); no
      neighbour health score dropped.
- [ ] PR opened — `Closes #N` (full fix) or `--partial` → `Part of #N` (slice)
      — evidence + health delta attached.
- [ ] `blocked: true` only after trying: reproduce, dev server, test DB, git
      history — never on first friction.
- [ ] Parallel mode: your worktree removed (`git worktree remove
      .worktrees/shipflow-loop-<n>` or, reconcile,
      `.worktrees/shipflow-loop-pr-<n>`) — after push, or on `blocked`;
      the pushed branch is the artifact. If the PR merged mid-fix, the
      artifacts are the leftover branch (`fix/pr-<n>-leftover`, pushed)
      and the follow-up issue — never a push to the closed head — and
      only when `$base..HEAD` is non-empty (§ "Merged mid-fix"); a
      zero-commit reconcile files nothing.

A `verified: true` you can't defend is worse than an honest `blocked`.

## Return (compact — this is all the orchestrator sees)
```json
{ "issue": 42, "pr": 87, "verified": true, "blocked": false,
  "regressionTest": "tests/foo.regression.test.ts" ,
  "healthDelta": "+4",
  "intakeCorrections": 0,
  "summary": "one line: what changed + how it was verified",
  "reason": "" }
```
`blocked: true` + `reason` when no PR was opened. `regressionTest`: the path
(or `"skipped: <why>"`, or `"proxy: <level> — <why>"` when it locks a proxy,
§4); `healthDelta`: score change (or `"n/a"` for backend);
`intakeCorrections`: how many `intake correction:` rows the PR body carries
(§5b) — the orchestrator sums it into the pass ledger so a brief that is
often wrong becomes visible. Keep `summary` to one line — no diffs or logs.

## Message style — everything you write on GitHub

All GitHub writing follows `message-style.md`. Don't restate it here.
Machine check: `lintMessageBody`
(`apps/renaissshipflow-cli/src/message-lint.ts`) via step 5's
`--lint=strict`.
