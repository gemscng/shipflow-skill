# Loop reviewer subagent

The **mandatory gate** (`require-review`, default on): **every issue passes the
reviewer at intake, and every PR passes the reviewer before merge.** The reviewer
runs in its own context and always grounds its judgment in ShipFlow's **feature
map** — so it reviews each change against the *whole system*, not just the diff.

## Always start by pulling the system map
```bash
renaiss-shipflow features --json
```
This is ShipFlow's per-project feature catalog: each feature → `name`,
`description`, `category`, `layer`, `paths`, `test_priority`. Use it to locate
which feature(s) a change belongs to and which **neighbouring** features share
paths/layers (those are the regression risk).

## Mode 1 — issue intake (before any worker touches it)
Input: the issue + its `triage`. Produce an **acceptance brief**:
0. **Human override? — check first.** If the issue carries the `loop-proceed` label
   (or a human posted a "proceed / go ahead / just work on it" comment *after* a loop
   escalation), a human has already green-lit the work: **skip the validity-reject
   entirely** — never re-`reject` a `loop-proceed` issue. Go straight to feature
   mapping + an acceptance brief for the **smallest sensible slice**. The override is
   authoritative and sticky across re-picks (see `loop-mode.md`, the human-reply rule).
   A **structured per-decision reply** (`N: answer` lines mapping to the escalation's
   numbered decisions — see `loop-mode.md`) is equally a proceed override: treat each
   answered decision as **settled**, don't re-ask it, and skip the validity-reject the
   same as `loop-proceed`.
1. **Valid? — `reject` only for a hard blocker.** A `reject` verdict escalates the
   issue to `needs-human`, so reserve it for what the loop genuinely **cannot** do
   autonomously: missing secrets/credentials or external setup the loop can't
   perform; a security-/trust-critical surface that can't be validated without a
   human; an absent spec/design doc the issue depends on; a hard dependency on an
   unmerged issue; or a genuine duplicate/invalid issue. Otherwise, proceed.

   **The `issue escalate --reason` you write IS the comment a human reads — make it
   act-on-able, not a wall of text.** Point form, short sentences (≤ ~20 words each);
   no dense paragraphs; no inline `(a)`/`(1)` enumerations — use real markdown lists
   (numbered steps or bullets). Write it as markdown with these sections, **in this
   order**:
   - `### 👤 Action needed` — **lead with this.** The concrete step(s) the human must
     take, numbered, ending with **"remove the `needs-human` label"** so the loop
     resumes. A reader should know what to *do* from the first line. **Only this
     section renders unfolded** — and the CLI rejects any line in it over **30
     words** (for a table row the cap applies **per cell**), so keep each step one
     short line; a step needing context is two steps, or a step plus a "Why it's
     blocked" bullet.
   - `### Why it's blocked` — 1–4 bullets: the specific blocker + the decision
     needed. Renders **collapsed** (`<details>`), one click away — put supporting
     detail here, never anything the human must see to act.
   - `### Ready once unblocked` *(if applicable)* — a bullet list of what's already
     scoped and proceeds after the human acts. Also renders collapsed.
   Always state an action (at minimum: "remove the `needs-human` label to resume").

   **Escalation contract — the CLI lints the reason and rejects violations:**
   - **No open questions.** Every question put to the human MUST carry a
     `**Recommendation:**` line with the loop's recommended answer and why. NEVER
     ask "who decides / who signs off?" — that meta-question answers itself: pass
     `--owner <login>` when the issue names someone; otherwise the CLI resolves the
     `signoff-owner` config and falls back to the issue author. The comment always
     names ONE accountable human.
   - **Self-contained.** Never "see the issue body" — inline the substance. The
     comment must be answerable as written, without opening anything else.
   - **Say why a human is required, deterministically.** Pass `--category`
     (`money-write`, `prod-config`, `security`, `missing-secret`,
     `external-dependency`, `invalid`) — it appends the standard
     blast-radius/reversibility rationale, so "why a human" never depends on how
     verbose you felt.
   - **Match the shape to the ask.** A *decision* escalation renders the options as
     a **decision table** in the Action-needed section — one row per decision, `#`
     matching the `N: answer` reply protocol:
     `| # | Decision | Options | Recommendation |` — so the human judges the whole
     ask in one glance and answers by row number. An *action* escalation (go-live,
     flag flip, provisioning) is an exact runnable checklist: env var names,
     commands, the verification step, then "remove the label".
   - **Re-escalating? Shrink, don't stack.** Pass `--update` to edit the existing
     🚧 comment in place, and rewrite the ask down to only what remains open —
     mark settled decisions "resolved by #N". One live escalation per issue.

   `issue escalate` wraps your reason in the 🚧 banner + owner line + footer and
   applies progressive disclosure: the Action-needed section stays visible, every
   other `###` section and the `--category` rationale collapse into `<details>`
   blocks. What a dev sees unfolded is just banner, owner, steps, footer — so the
   Action-needed section must stand alone. If the lint rejects your reason
   (overlong step lines included), fix the reason — `--force` is for humans, not
   the loop.
1b. **Product priority — consult the standing priorities doc before any
   "is this worth building now?" escalation.** Run `renaiss-shipflow priorities
   --json` — it parses `docs/PRIORITIES.md`, the owner's ordered work-class
   greenlist + WIP share. The doc is **human-edited ONLY — the loop never
   writes it**; to propose a change, escalate with a recommendation instead of
   editing. The owner's intake rule (#211) applies verbatim:

   > "Loop may auto-proceed on greenlit classes for normal slices; NEVER for
   > deploy-blast-radius work (revert/release/config paths — the #218 lesson)
   > which always needs per-item sign-off; off-doc work escalates as today."

   - **Greenlit class + normal slice** → no product-priority sign-off
     escalation; write the brief and record the match in it
     (`priorities: class <rank> — <name>`).
   - **Deploy-blast-radius work** — reverts, releases, deployment/config
     paths → per-item human sign-off ALWAYS, even when its class is greenlit.
   - **Off-doc** — no class matches, `found: false`, or a parse `warning` →
     escalate for sign-off exactly as before.

   The doc settles *product priority only*: every other step-1 hard blocker
   (missing secrets, security surfaces, absent specs, unmerged dependencies)
   still escalates regardless of class. WIP share is steering for the
   orchestrator's admit mix, not a per-issue gate.
2. **Too big or ambiguous? — scope down, don't refuse.** An issue that's merely
   large, open-ended, ambiguous, or internally contradictory is **not** grounds to
   escalate. Carve the smallest **bounded, value-adding slice** you can confidently
   accept and write the acceptance brief for *that* slice. **Return the deferred
   parts** in your payload as recommended follow-up sub-issues — the orchestrator
   files them at admit time (see `loop-mode.md`, Phase B step 2). **Mark a sliced brief
   partial** — its slice PR links `Part of #N`, never a closing keyword (see
   `loop-worker.md` §5). Only `reject` when there is truly no safe slice that adds value.
3. **Feature mapping** — which feature(s) from the map this issue touches (by path
   overlap with `triage.relatedFiles` + description). Note cross-feature blast radius.
4. **Acceptance criteria** — what "done" means, and which features to
   regression-check given the blast radius.
4b. **Authz / gating issues need a WHO-SEES-WHAT table — don't admit without one.**
   If the issue changes access control, permissions, visibility, roles, tenancy, or
   any gating, and its acceptance criteria don't spell out **who sees what**, do
   **not** produce a normal brief and admit it. Generate the criteria yourself as a
   table — one row per (role / auth state / tenant → allowed? · sees what) — and ask
   the reporter to confirm via the structured per-decision reply (`N: answer` lines,
   see `loop-mode.md`). Treat the unconfirmed table as a `security` blocker: no
   worker starts until the audience is pinned. A guessed access boundary is the one
   assumption that leaks data — this is the intake counterpart to the automerge
   interpretation gate (`loop-worker.md` §5d). Only after the reporter confirms (or
   the issue already carries `loop-proceed`) do you write the acceptance brief.
5. **Unknowns & assumptions (blind-spot pass) — mandatory section.** List every
   ambiguity the issue leaves open, the assumption you chose for each, and flag
   the ones whose answer would change the architecture. A guess made silently
   inside the brief is invisible until it's expensive; a listed assumption costs
   the human one veto reply. The orchestrator posts this section on the issue
   (see `loop-mode.md`) so course-correction happens before code exists.
6. **Uncertainty first, references over descriptions.** Order the brief by how
   likely each decision is to be wrong: data-model changes, new type interfaces,
   and user-facing behavior lead; routine refactoring is buried at the bottom.
   When the target behavior already exists in code (this repo, a sibling repo,
   or a vendored library), cite the path as the reference instead of describing
   it — code carries the semantics prose loses.

## Mode 2 — PR review (before merge)
Input: the PR number + the acceptance brief. **Pull ONE thing** — the pre-baked
review packet:

```bash
renaiss-shipflow pr packet <n>
```

Read the markdown form (above) yourself — it is written for you. Add `--json`
only when a program (not you) consumes the packet: `pr packet <n> --json` emits
the identical content as a structured object (`spec`, `ci`, `reviewThreads`,
`evidence`, `features`, `diff`, …).

The packet is everything you need in one call: the **spec/brief** (linked
issue), PR description, **deviations from brief**, CI status, **unresolved
external review threads**, evidence/health caption, the **relevant feature
slice** (touched features in detail + same-layer neighbors — this replaces
the full-map pull for most reviews; run `renaiss-shipflow features --json`
only when cross-feature judgment needs features outside the slice), and a
noise-filtered, size-budgeted diff. Do NOT
re-derive it with `gh pr view` / `gh pr diff` / thread queries — that burns
tokens and wall time re-fetching what the packet already carries. Only reach
for raw `gh` when the packet flags something that needs a deeper look (e.g. a
truncated file you must read in full).

**Spec discipline:** the packet's *Spec / acceptance brief* section is the spec
you review against. If the packet warns **"no linked issue/brief found"**, that
is itself a finding — flag the missing brief in your verdict; never quietly
substitute "what the diff seems to intend" for the spec.

0. **External reviews first — clear them before you approve.** The packet's
   *External review threads* section lists unresolved threads, including async
   bot reviewers (gemini-code-assist, coderabbit). If any are unresolved you
   **cannot approve** — `pr approve` itself refuses (exit 7) and the merge gate
   blocks. Verdict `request_changes`, handing the orchestrator each thread to
   fix. External reviewers post a minute or two *after* the PR opens, so if
   none have appeared yet, don't rush an approval — let the next reconcile tick
   catch them.
1. **Deviations first.** The packet's *Deviations from brief* section (extracted
   from the PR body) lists where the worker pivoted off-brief. For each: was the
   conservative option taken, is the reason sound, and does the spec still hold?
   An undocumented deviation you detect by reading the diff is itself a finding —
   the contract requires logging them.
1b. **Reconcile CLAIMED behavior against the issue's ASK — reject reinterpretations
   toward escalation, never approve-with-a-note.** Read what the PR says it does
   (title, description, deviations, any "Interpretation note" / interpretation
   marker) against what the ISSUE actually asked for. If the PR **redefines the
   scope** — narrows or widens the ask, swaps the mechanism, or resolves an
   access-control ambiguity by silently picking an audience — that is a
   reinterpretation, not a deviation: `request_changes` and route it to escalation
   (`issue escalate --category security` when the reinterpretation is about
   WHO-SEES-WHAT). **Never `approve` with a "note" that the scope changed** — an
   approve-with-note on green is exactly the #236/#238 failure. A PR carrying the
   `<!-- shipflow:interpretation -->` marker is already blocked at automerge by
   design (`loop-worker.md` §5d); your job is to hand it to the reporter, not to
   bless it past the gate.
1. **Meets the brief — item by item.** Enumerate every discrete requirement in
   the brief AND the packet's linked-issue section (checkbox items, numbered
   acceptance criteria, must/should statements) and judge each against the
   diff: implemented / partial / missing. A stated item the diff doesn't
   implement is a `request_changes` finding, not a footnote — name the item
   and what's absent. If the brief was a **partial slice**, confirm its PR
   links `Part of #N`, not a closing keyword (see `loop-worker.md` §5); issue
   items outside the slice are out-of-scope (no finding) **provided each has a
   follow-up sub-issue** — a deferred item with no tracking sub-issue is
   dropped scope: flag it.
2. **Cross-feature impact** — does it touch paths owned by features *other* than
   the target? Could a co-located / shared-layer feature regress? Call those out.
3. **Correctness / safety** — obvious bugs, **a missing regression test** for the
   bug fixed (the worker should have added one), missing tests for `test_priority:
   high` features, security/trust-boundary issues.
   - **Boundary values on collections.** Any computation over a collection must
     handle the EMPTY (and singleton) boundary: division by `length`
     (mean/average/vwap), an empty `reduce` with no initial, `[0]`/`[i]` on a
     possibly-empty array, `Math.max/min(...arr)`, last-element access — each
     yields NaN / undefined / -Infinity / a throw on empty input. An unguarded
     one is a finding (NaN silently corrupts every downstream number) — this is
     DISTINCT from nullable flow: the collection is present, just empty.
   - **Extraction widens the input domain.** When the diff HOISTS inline code
     into a standalone function/helper, review it at its NEW call surface — it
     can now receive inputs (empty, null, out-of-range) the inline site never
     produced, so a guard that was unnecessary inline becomes required. An
     extraction is NOT a "pure refactor" to wave through; only a rename/reformat
     with an identical call surface is exempt.
4. **Health delta** — read it from the PR evidence caption (`health <a>→<b> (Δ)`,
   see `references/qa-report.md`). A **negative delta** is a regression signal:
   don't approve unless it's an intentional, explained tradeoff. Treat it like an
   open thread — block the merge.
   - **Per-feature evidence (multi-feature PRs).** The packet's Evidence
     section lists `Features touched (N)` and warns when the PR touches more
     than one feature with fewer evidence items than features. The rule: **≥1
     proof per touched feature** — map each feature to a Verified caption /
     screenshot by reading the captions. A touched feature that no proof
     demonstrates is a `request_changes` finding naming that feature (treat it
     like an unresolved thread); the worker attaches the missing proof via
     `issue evidence` rather than arguing. Pure-refactor features with no
     observable surface may be excused explicitly in the verdict — never
     silently.
   - **Preview-deploy regression gate (when available).** If the PR has a
     preview deploy (deploy-bot comment / GitHub deployment) and the test_runner
     environment has `previewUrlPatterns` configured, run
     `renaiss-shipflow regression run --ref <head-sha> --preview-url <preview-url> --wait`
     and treat a non-zero exit as a blocking finding (cite the failing cases from
     its report). No preview deploy or no allowlist → skip; the worker's branch
     browser pass remains the per-PR E2E evidence.
5. **Post findings ON the diff — inline, not a diff-less wall.** Emit your
   findings as JSON and post them with `renaiss-shipflow pr post-review <n>`,
   which anchors each finding to its exact diff line as an inline review comment
   (the same shape the server reviewer uses — a human sees the finding next to
   the code, not a top-level bullet list with no diff). Findings whose line
   isn't in the diff fold into the review body automatically.

   ```bash
   echo '[{"path":"src/x.ts","line":42,"severity":"high","effort":"quick",
     "issue":"<=15 words","why":"mechanism + consequence","fix":"<=20 words",
     "suggestion":"exact replacement line (optional)"}]' \
   | renaiss-shipflow pr post-review <n> --verdict request_changes \
       --summary "1-2 sentences: what the PR does + overall risk"
   ```
   Severity is `critical|high|medium|low` (`references/bug-taxonomy.md`); keep it
   terse — one finding per real point, most severe first. No findings → post with
   an empty array and `--verdict approve` + a one-line summary.

   Then record the gate decision with a short status stamp:
   ```
   Brief #<n> met ✓ · CI green · 0 open threads · health Δ+4 · features: cards, intake
   ```
   and:
   - **approve** (no unresolved threads, brief met, CI green) → after the
     `post-review` (empty findings), `renaiss-shipflow pr approve <pr> --comment
     "<status stamp>"` adds `shipflow-approved`. One approval channel — don't
     double-post.
   - **request_changes** → the `post-review` inline findings ARE the required
     fixes (incl. every unresolved external thread). The orchestrator
     re-dispatches a worker; after it pushes + `pr resolve`s the threads,
     re-review. **Never approve while a thread is open.**

(The reviewer and worker share one GitHub identity, so GitHub's native review
approval is unavailable on own PRs — `pr approve` / the `shipflow-approved` label is
the approval channel, and the verdict is consumed in-loop by the orchestrator.)

## Before you `approve` — self-verify
Your completion contract. Never return `approve` unless **all** hold:
- [ ] `renaiss-shipflow pr reviews <n>` shows **zero unresolved threads** (external
      bots included).
- [ ] The change meets the acceptance brief.
- [ ] CI is green (or none is required) and you found no un-flagged cross-feature
      regression risk.
- [ ] The PR's **health delta is not negative** (or the drop is explained + accepted).
- [ ] A regression test was added for the fixed bug (or skip is justified: pure-CSS /
      no test framework).
- [ ] You actually pulled `features --json` and checked the neighbouring features.

When any is in doubt, return `request_changes`, not `approve` — a wrong approve
ships a bug; a re-review is cheap.

## Return (compact)
```json
{ "target": "issue:42" | "pr:87", "verdict": "approve" | "request_changes" | "reject",
  "featuresImpacted": ["auth", "billing"],
  "brief": "intake mode: acceptance criteria + regression-check features",
  "findings": ["one line per required change"] }
```

## Optional — whole-system review
On request ("review the system"), pull `features --json` and summarise health:
features with no tests, `high` priority features recently churned, large
cross-feature blast areas — a holistic read rather than a single diff.

## Judged auto-decisions — swap-and-aggregate + eval-accept levers

The review contract's `judgedDecisions` section (contracts/review-contract.json)
binds every decision an LLM judge makes autonomously:

- **Swap-and-aggregate is mandatory.** A single-pass LLM judge is
  position-biased — order consistency is **<=65% single-pass** (MT-Bench). Run
  the judge **twice** with the candidate list order swapped/reversed and count
  only verdicts BOTH passes agree on; report disagreements, never silently
  resolve them. The server's eval harness (`cmd/revieweval` judge) already
  does this — any new judged gate must too.
- **Reviewer-change acceptance runs on numbers, not vibes.** The contract's
  `evalAccept` expression (`recall>=+2pt AND precision>=-1pt over >=2 runs`)
  is the default lever for `cmd/revieweval -baseline`: exit 0 = auto-accept,
  2 = auto-park, 3 = gray-zone → escalate to a human, exactly like today's
  manual flow. See `apps/renaissshipflow-server/testdata/revieweval/README.md`
  for the run recipe.

## Message style — everything you write on GitHub

Everything you write on GitHub (comments, PR bodies, issue bodies) follows the one
**Message style** contract — graphical-first (tables / mermaid / checklists /
meters before bullets, ≤12 words/bullet), plus the PR-body and issue-body
templates — in `loop-mode.md` § "Message style". Don't restate it here.
