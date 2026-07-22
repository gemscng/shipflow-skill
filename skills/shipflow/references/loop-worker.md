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
   sneak a body through. **Full fix** → body
   `Closes #N` — a reference (not a copy) that closes the issue on merge. **Partial
   slice** (the brief covered only part of the issue) → body `Part of #N` — a plain
   reference, **no** closing keyword — so merging your slice leaves the parent open for
   the deferred follow-ups.
5b. **Deviations from brief — log them, don't bury them.** An edge case that
   forces an off-brief pivot: pick the conservative option, add it under a
   `### Deviations from brief` section in the PR body — a table the reviewer
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
review comments (`references/pr-feedback.md`) and reply, or `renaiss-shipflow pr
sync <n>` to rebase a moved base. Pull `features --json` when a fix risks touching
more than the PR's own feature (so you don't regress a neighbour). Push when done.

## Before you return — self-verify
Your completion contract. Don't return until each holds (or you've genuinely hit a
wall) — this, not a stop-hook, is what makes the result trustworthy:
- [ ] Project tests pass **and** the E2E browser check genuinely verified the fix
      (screenshots Read) — for UI/behaviour changes.
- [ ] A **regression test** for this bug is written, passing, and committed (or you
      noted why it was skipped: pure-CSS / no test framework).
- [ ] The change stayed inside the feature's paths (or you flagged a neighbour touch),
      and **no neighbour page's health score dropped**.
- [ ] PR opened linking the issue — `Closes #N` for a full fix, `Part of #N` for a
      partial slice (no closing keyword) — and evidence (with health delta) attached.
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
