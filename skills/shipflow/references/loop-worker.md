# Loop worker subagent

One **worker** per work item, dispatched via the Task tool; it runs in its
**own context** and returns only a compact payload (see Return). Solo: run in
the loop worktree. **Parallel mode**: your own worktree (`shipflow-loop-<n>`),
never shared (`loop-mode.md` § Setup).

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
`request_changes`. Scoped to these markers only — the packet's own ⚠️ (missing
brief / thin coverage) and two neutral `NOTE` lines are not degradations:
`NOTE per-feature evidence coverage not applicable — no ShipFlow feature map
covers <repo> (cross-repo --repo target)` and `NOTE #N is not a readable issue
in <repo> — no acceptance brief to load` (`--json` `spec.notReadable: true`) —
judge the stale link on its merits.

## What a fix worker does (one issue, end-to-end)
1. **Branch** — `git fetch origin && git checkout -b fix/issue-<n>-<slug> origin/<default>`,
   then `renaiss-shipflow git-identity --fix` **before the first commit** —
   unmatched author emails block deployments, and `pr create` refuses such
   branches.
2. **Map, then fix** — `renaiss-shipflow features --json` (or `--category
   <area>`): each feature's **file paths**, **test priority**, and
   **neighbours** sharing those paths. Stay inside your feature's paths; flag
   any neighbour touch for the reviewer. Investigate (brief +
   `triage.relatedFiles`) using full git history: `git log -p -- <file>`,
   `git blame`, `triage.relatedCommits`, `git log --since` / bisect for
   regressions. Make the change. Genuinely try to verify — start the dev
   server, seed a test DB; environmental friction is not grounds to abandon.
3. **Test** — run the project's tests, then **verify end-to-end in a real
   browser** for any UI/behavior change (`references/browser-testing.md`:
   `bin/shipflow-browser --ensure`, scope from diff + adjacent pages, drive
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
5. **PR** — commit via Skill tool → **`shipflow:smart-commit`**
   (plugin-qualified — a bare name can resolve to another plugin's copy,
   #544; message-style.md § "Commit messages": no AI-attribution trailer, skip
   the human-confirm gate). Push, then
   `renaiss-shipflow pr create --json --lint=strict` — MANDATORY: the prose
   lint (#196) exits 2 on a prose-shaped body (≥3 parallel facts, no
   table/checklist/bullets), creating nothing; restructure and re-run, never
   drop the flag. Never bump versions in the PR or state them in the body —
   auto-bump versions main after merge (#548).
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
   take the conservative option, record it under a **Deviations from brief**
   heading (any level — parser normalizes): `| Deviation | Why | Risk |`, one
   row each, cells ≤10 words (the reviewer verifies every row); keep going. A
   deviation only in a commit message is invisible to review. No deviations →
   no section. Any deviations section = automerge blocker (#190):
   `pr automerge`/`pr ready` refuse + apply `needs-reporter-review` — silence
   is not consent; clears on one reporter reply (or maintainer label
   removal). Genuine *reinterpretation* → 5d.
5c. **UI work: mock first.** For `category:ui` issues (or any change whose
   acceptance depends on how it LOOKS), slice 1 is a static mock — HTML page
   or screenshot with fake data — attached as evidence for reaction before
   behavior is wired.
5d. **Access-control ambiguity is a `security` escalation — don't guess, never
   ship a silent reinterpretation.** Unclear WHO SEES WHAT (permissions,
   roles, tenant/visibility scope, auth gating)? Never proceed-with-a-note —
   `renaiss-shipflow issue escalate --category security` with a
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
   Before+after pairs required — `before[i]` pairs with `after[i]`, `--label`
   names each pair; lone shots / mismatched counts are rejected. `--file`:
   supplementary screen recording only. `--actual`: bug-filing only (no fix
   yet), never fix evidence — the CLI refuses to mix it with a pair. Pass
   `--touched "<feature>"…` (features the diff touches): the gallery renders
   a red gap card for any touched feature lacking a proof pair.
   **One pair per changed surface, one proof per feature** — the reviewer
   blocks multi-feature PRs with fewer proofs than touched features.
   **One claim per image** — a caption asserts only what its image shows;
   needs "and" → split into more labeled pairs.
   **Mark the change, don't cover it** — before each after-shot, outline the
   changed region: `outline: 3px solid #ff3b30; outline-offset: 3px`
   (`$BROWSE js '…'`, recipe in `references/browser-testing.md` §4, or the
   browser-service `screenshot` `highlight` param). The outline renders
   OUTSIDE the element; never opaque overlays, arrows, or boxes across the
   content.

Too risky / ambiguous / unreproducible / unverifiable → do **not** open a PR;
report `blocked` with the reason (the orchestrator will `issue escalate`).

## What a reconcile worker does (one PR)
One PR + the reason(s) from `inbox`: fix failing CI; or address review
comments (`references/pr-feedback.md`) and reply; or rebase a moved base —
`renaiss-shipflow pr sync <n>`, resolving conflicts agentically via
`--keep-conflicts` + `references/conflict-resolution.md` (resolve by intent,
test, force-with-lease, comment) instead of escalating. Pull `features --json`
when a fix risks touching more than the PR's own feature. Push when done.
An immediate post-push `pr reviews` zero is **not** a settled measurement —
external bots post 1–2 minutes later. automerge owns the 120s settle wait;
do not merge on that zero.

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

A `verified: true` you can't defend is worse than an honest `blocked`.

## Return (compact — this is all the orchestrator sees)
```json
{ "issue": 42, "pr": 87, "verified": true, "blocked": false,
  "regressionTest": "tests/foo.regression.test.ts" ,
  "healthDelta": "+4",
  "summary": "one line: what changed + how it was verified",
  "reason": "" }
```
`blocked: true` + `reason` when no PR was opened. `regressionTest`: the path
(or `"skipped: <why>"`); `healthDelta`: score change (or `"n/a"` for backend).
Keep `summary` to one line — no diffs or logs.

## Message style — everything you write on GitHub

All GitHub writing (comments, PR bodies, issue bodies) follows the **Message
style** contract — `message-style.md`; don't restate it here.
Machine-checked: `pr create --lint=strict` (step 5) rejects pure prose when ≥3
parallel facts exist; `issue create` warns on the same shape. Fix the body,
never bypass the lint.
