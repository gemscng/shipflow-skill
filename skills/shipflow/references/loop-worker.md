# Loop worker subagent

The orchestrator dispatches one **worker** per work item via the Task tool. The
worker runs in its **own context** and returns a compact payload — its code
reading, edits, and test output never reach the orchestrator. Run inside the loop
worktree (sequential) or a dedicated worktree (parallel mode).

## Input the orchestrator passes
- `issue` number + the `triage` payload (relatedFiles / relatedCommits / features)
- the reviewer's **acceptance brief** (what "done" means + the feature(s) it touches
  + features to regression-check)
- repo, default branch, and the active policies (so it knows the test/CI bar)

You also pull ShipFlow's **feature map** yourself (below) — that keeps the heavy
data in your context, not the orchestrator's.

## Degraded inputs — read the ⚠️ markers, never work past them
Mirrors `loop-reviewer.md` § "Degradation discipline". A dependency may never
remove a check without saying so **in the artifact you read**, so every ShipFlow
command marks the inputs it failed to obtain — in its own output, not only on
stderr (a piped or captured artifact never sees stderr):

| Marker | What did NOT load | What you must do |
|---|---|---|
| `⚠️ triage unavailable — ShipFlow context and relatedFiles NOT loaded` (`issue work`/`issue next`; `--json` `triageUnavailable: true`) | triage: `relatedFiles`, `relatedCommits`, features | Re-run before relying on `triage.*`; don't treat an empty context as "nothing related" |
| `⚠️ review threads UNAVAILABLE — unresolved count NOT determined` (`pr packet`; `--json` `reviewThreads.unresolved: null`) | the unresolved-thread count | **Not zero.** Re-run, or `renaiss-shipflow pr reviews <n>` |
| `⚠️ Brief NOT loaded — issue #N could not be read` (`pr packet`; `--json` `spec.unavailable: true`) | the acceptance brief | **Not "no brief".** Re-run, or `gh issue view <n>` |
| `⚠️ WARNING shipflow-api feature map unavailable … NOT checked` (`pr packet`; `--json` `degraded[]`) | per-feature evidence coverage | Pull `features --json` yourself before claiming neighbour coverage |

Two rules: **a missing marker means the check ran** — so never add one by hand
to excuse skipped work; and **a present marker is never a footnote** — the
reviewer treats any `degraded[]` entry or degraded-input marker from the table
above as `request_changes`, so a PR whose evidence rests on a degraded read
comes straight back.

The rule is scoped to those markers, **not to every ⚠️**: the packet quotes
issue and PR bodies verbatim and emits its own ⚠️ for a missing brief or thin
coverage. Two neutral `NOTE` lines are likewise **not** degradations:
`NOTE per-feature evidence coverage not applicable — no ShipFlow feature map
covers <repo> (cross-repo --repo target)` — nothing was attempted, so nothing
failed — and `NOTE #N is not a readable issue in <repo> — no acceptance brief
to load` (`--json` `spec.notReadable: true`) — GitHub **answered** about the
number, so nothing went dark; judge the stale link on its merits. Keep the
markers reserved for real failures — they stop meaning anything the day they
also mean "irrelevant".

## What a fix worker does (one issue, end-to-end)
1. **Branch** — `git fetch origin && git checkout -b fix/issue-<n>-<slug> origin/<default>`.
   Then `renaiss-shipflow git-identity --fix` **before the first commit**: a fresh
   worktree on a headless machine may have no git identity, and `user@hostname`
   author emails can't be matched to a GitHub account — deployments get blocked
   and `pr create` refuses such branches.
2. **Map, then fix** — first pull the **feature map** for context:
   `renaiss-shipflow features --json` (or `--category <area>` to scope to the
   feature(s) the brief named). It gives each feature's **file paths**, **test
   priority**, and the **neighbouring** features that share those paths. Stay
   inside your feature's paths; if a change must touch a neighbour's, flag it for
   the reviewer. Then investigate (brief + `triage.relatedFiles`). The worktree has
   the **full git history** — use it: `git log -p -- <file>`, `git blame <file>`,
   and `triage.relatedCommits` to see *why* code is the way it is and what changed
   recently (essential for regressions / "it worked before" — `git log --since` /
   bisect the suspect range). Then make the change. Genuinely try to verify — start
   the dev server, seed a test DB; environmental friction is not grounds to abandon.
3. **Test** — run the project's tests, then **verify end-to-end in a real browser**
   for any UI/behavior change (`references/browser-testing.md`: `bin/shipflow-browser --ensure`,
   **scope the pass from the diff + adjacent pages**, drive the fix, `snapshot -D` +
   no new console errors, capture before/after **screenshots** and Read them, and
   **score** the affected + neighbour pages — `references/qa-report.md`, a dropped
   neighbour score means you regressed it). Pure backend/library changes verify on
   tests alone.
   - **Branch E2E vs ShipFlow regression E2E.** This browser pass tests *your
     branch's* code (local dev server) — it's the always-available per-PR gate.
     ShipFlow's server-side **regression test_runner** additionally supports
     per-branch runs when the PR has a **preview deploy** (Vercel etc.): run
     `renaiss-shipflow regression run --ref <head-sha> --preview-url <preview-url> --wait`
     and gate on its exit code. The preview host must match the environment's
     `previewUrlPatterns` allowlist (test_runner settings) or the run fails
     loudly — ask the operator to add the pattern once, don't retry blindly.
     Find the preview URL on the PR (deploy-bot comment / GitHub deployment).
     No preview deploy → skip this and rely on the branch browser pass; the
     deployed-env regression stays in the Phase-C sweep and post-deploy gate.
4. **Regression test** — after the fix verifies, **add a test that locks it in**.
   Trace the bug's codepath (what input/state triggered it, which branch broke),
   then write ONE test matching the project's existing style (read 2–3 nearby test
   files first — naming, imports, assertion style). Assert the *correct behavior*,
   not "it renders". Run just that file; commit it with the fix. Skip only for
   pure-CSS changes or when the project genuinely has no test framework (note it in
   the return). An autonomous fix with no regression test silently regresses later.
5. **PR** — commit by **invoking the `smart-commit` skill** (Skill tool →
   `smart-commit`; it splits the diff into atomic conventional commits) — see
   loop-mode.md § "Commit messages": no AI-attribution trailer, and skip the
   skill's human-confirm gate (execute its plan directly — no human to answer).
   Then push, `renaiss-shipflow pr create --json --lint=strict`.
   Loop workers MUST pass `--lint=strict`: the deterministic prose lint (issue
   #196) rejects a prose-shaped body (≥3 parallel facts but no
   table/checklist/bullets) with exit 2 and creates nothing — restructure the
   body per the Message style contract and re-run; never drop the flag to
   sneak a body through.
   **Readable-body contract (issue #464)** — a body full of tables can still be
   an unreadable wall. The HEADLINE (what renders un-collapsed) is at most ~25
   visible lines: TLDR (≤4 sentences — what/why/risk), "What changed" (≤3
   bullets), one Verified line. EVERYTHING else — root-cause diagrams, file
   tables, format matrices, testing checklists, review-round logs — goes inside
   `<details><summary><b>Section name</b> — one-line gist</summary>` blocks.
   Two exceptions stay visible, never folded: a **Deviations from brief**
   section (the reporter must see the intent-gate surface) and the
   `<!-- shipflow:interpretation -->` marker. The lint enforces a hard ceiling
   (50 visible lines outside `<details>`, exit 2 under `--lint=strict`); write
   for ~25, not for the ceiling. **Full fix** → the injected header links
   `Closes #N` — a reference (not a copy) that closes the issue on merge (the
   default). **Partial slice** (the brief covered only part of the issue) → pass
   **`--partial`**: the header then links `Part of #N` — a plain reference, **no**
   closing keyword — so merging your slice leaves the parent open for the deferred
   follow-ups. Don't hand-write `Part of #N` in `--body` to override the header —
   the header still injects its own link; `--partial` is what switches it.
5b. **Deviations from brief — log them, don't bury them.** An edge case that
   forces an off-brief pivot: pick the conservative option, add it under a
   **Deviations from brief** heading in the PR body (any heading level — the
   parser normalizes level, case and decoration) — a table the reviewer
   judges row by row: `| Deviation | Why | Risk |` (one row each, cells ≤10
   words) — and keep going. The review packet extracts this section
   and the reviewer verifies every entry — a deviation that only lives in a
   commit message is invisible to review and to the human. No deviations → no
   section. **Any deviations section makes intent risk a first-class automerge
   blocker** (issue #190): `pr automerge`/`pr ready` refuse to merge and apply
   `needs-reporter-review` so the reporter confirms your reading — silence is not
   consent. That's by design; a routine conservative deviation clears on one
   reporter reply (or a maintainer removing the label). If the pivot is a genuine
   *reinterpretation* of the ask, not a conservative deviation, see 5d.
5c. **UI work: mock first.** For `category:ui` issues (or any change whose
   acceptance depends on how it LOOKS), make slice 1 a static mock — an HTML
   page or screenshot with fake data — attached as evidence for reaction
   before behavior is wired. Recognize-on-sight criteria surface on the mock,
   not on the finished build.
5d. **Access-control ambiguity is a `security` escalation — don't guess, and
   never ship a silent reinterpretation.** When the ask is unclear on WHO SEES
   WHAT (permissions, roles, tenant/visibility scope, auth gating), that is the
   `security` escalation class: do **not** pick a reading and proceed-with-a-note.
   Stop and `renaiss-shipflow issue escalate --category security` with a
   `**Recommendation:**` naming the audience you'd default to and why — guessing an
   access boundary is the one deviation that can leak data, and the escalation
   contract requires a recommended answer, never an open "who decides?" question.
   If, after a human proceed, you still ship a **deliberate reinterpretation** of
   the brief, it MUST carry the interpretation marker
   `<!-- shipflow:interpretation -->` (contract `markers.interpretationNote`) in the
   PR body. That marker is a deterministic automerge blocker (5b) — it forces the
   reporter to confirm your reading before it can reach production. A reinterpretation
   without the marker is the exact #236/#238 failure: an intent change flowing
   through a non-blocking channel on green.
6. **Evidence** — `renaiss-shipflow issue evidence <n> --pr <pr>
   --before <s1-before.png> <s2-before.png> --after <s1-after.png> <s2-after.png>
   --label "<surface 1>" "<surface 2>"
   --caption "Verified: <what> · health <before>→<after> (Δ<+/-N>)"`.
   Screenshots **must** be before+after pairs — `before[i]` pairs with
   `after[i]`, `--label` names each pair — and the command rejects a lone shot
   or mismatched counts. `--file` is only for a supplementary screen recording.
   Pass `--touched "<feature>"…` (the features your diff touches, from the
   map) — the hosted evidence gallery renders a red gap card for any touched
   feature lacking a proof pair, so coverage holes are visible before review.
   **One pair per changed surface, one proof per feature:** a fix that touches
   several surfaces/states attaches a labeled pair for EACH (they render as a
   side-by-side pairs table); when the diff touches more than one feature (the
   map you pulled tells you), attach at least one evidence item PER feature,
   each label/caption naming what it demonstrates. The reviewer blocks
   multi-feature PRs whose packet shows fewer proofs than touched features.
   **One claim per image:** a caption may assert only what its own image shows.
   If the caption needs "and" — or lists surfaces/viewports — split into more
   labeled pairs.
   **Mark the change, don't cover it:** before each after-shot, outline the
   changed region — `outline: 3px solid #ff3b30; outline-offset: 3px` on the
   element (via `$BROWSE js '…'`, recipe in `references/browser-testing.md` §4,
   or the browser-service `screenshot` `highlight` param). The outline renders
   OUTSIDE the element, so no pixel of the change is covered; never draw
   opaque overlays, arrows, or boxes across the content.

If it's truly too risky / ambiguous / unreproducible / unverifiable, do **not**
open a PR — report `blocked` with the reason (the orchestrator will `issue escalate`).

## What a reconcile worker does (one PR)
Scoped to a single PR + the reason(s) from `inbox`: fix failing CI, or address
review comments (`references/pr-feedback.md`) and reply, or rebase a moved base —
`renaiss-shipflow pr sync <n>`, and when it conflicts, resolve agentically via
`--keep-conflicts` + `references/conflict-resolution.md` (resolve by intent, test,
force-with-lease, comment) instead of escalating. Pull `features --json` when a
fix risks touching more than the PR's own feature (so you don't regress a
neighbour). Push when done.

## Before you return — self-verify
Your completion contract. Don't return until each holds (or you've genuinely hit a
wall) — this, not a stop-hook, is what makes the result trustworthy:
- [ ] Project tests pass **and** the E2E browser check genuinely verified the fix
      (screenshots Read) — for UI/behaviour changes.
- [ ] A **regression test** for this bug is written, passing, and committed (or you
      noted why it was skipped: pure-CSS / no test framework).
- [ ] The change stayed inside the feature's paths (or you flagged a neighbour touch),
      and **no neighbour page's health score dropped**.
- [ ] PR opened linking the issue — default `Closes #N` for a full fix; pass
      `--partial` to `pr create` for a slice, which links `Part of #N` (no closing
      keyword) — and evidence (with health delta) attached.
- [ ] You only set `blocked: true` after honestly trying to reproduce, start the dev
      server, seed a test DB, and read git history — never on first friction.

A `verified: true` you can't defend is worse than an honest `blocked` — the reviewer
gate (and a re-dispatch) will catch a bluff anyway.

## Return (compact — this is all the orchestrator sees)
```json
{ "issue": 42, "pr": 87, "verified": true, "blocked": false,
  "regressionTest": "tests/foo.regression.test.ts" ,
  "healthDelta": "+4",
  "summary": "one line: what changed + how it was verified",
  "reason": "" }
```
Set `blocked: true` + `reason` when no PR was opened. `regressionTest` is the path
(or `"skipped: <why>"`); `healthDelta` is the score change (or `"n/a"` for backend).
Keep `summary` to one line — do not paste diffs or logs back to the orchestrator.

## Message style — everything you write on GitHub

Everything you write on GitHub (comments, PR bodies, issue bodies) follows the one
**Message style** contract — graphical-first (tables / mermaid / checklists /
meters before bullets, ≤12 words/bullet), plus the PR-body and issue-body
templates — in `loop-mode.md` § "Message style". Don't restate it here.

Part of that contract is machine-checked now: `pr create --lint=strict`
(mandatory in loop mode — step 5) deterministically rejects a PR body that is
pure prose while ≥3 parallel facts exist, and `issue create` warns on the same
shape. A lint warning on any surface means the body violates this contract —
fix the body, never bypass the lint.
