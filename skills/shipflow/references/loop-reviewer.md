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
0b. **Security diff scan — a HARD PRECONDITION, and the diff comes from a FILE
   you captured, never from the cwd.**

   **YOU are the scanner.** Not `security-review` — you. Its diff collector
   cannot be pointed at a file (proof below), so the procedure is: capture the
   diff, **read it**, write down what you found, attest to all three. Every step
   is something you can actually do, which is the point — a precondition no
   execution path can clear parks every code PR forever.

   **Step 1 — capture the diff server-side. Non-negotiable, and it runs first.**
   ```bash
   renaiss-shipflow pr diff <n> --out /tmp/pr-<n>.patch
   # prints: files=<n> lines=<n> sha256=<hex>
   ```
   This reads GitHub's own view of the PR and resolves **nothing** from your
   working directory: not HEAD, not a base ref, not the index. It **exits 9** on
   a capture with zero files in it — unconditionally, whatever the file census
   says. A non-zero exit here is a **blocker**: `request_changes`, never a
   retry-and-hope.

   Why a file and not stdout: a large diff piped through the agent's output path
   meets output compression, and a compressed capture makes
   `grep -c '^diff --git'` read **0** on a perfectly good diff — a false empty.
   Read the `files=` and `sha256=` the command prints; don't re-derive them. The
   capture is written `0600` — it is the full unfiltered diff of a private repo
   at a predictable path.

   **Step 2 — READ `/tmp/pr-<n>.patch` yourself.** Open it with the Read tool
   and go through the hunks. That file, and nothing else, is the scan input:

   | Look for | In particular |
   |---|---|
   | Secrets / tokens / keys | new literals, `.env`, fixtures, log lines that print credentials |
   | Authz + access surfaces | who can call this, who can see this, gates removed or widened |
   | Input handling | parsing, deserialization, path joins, shell/SQL construction |
   | New exec / network paths | `execSync`, `spawn`, `fetch`, new endpoints, new file writes |
   | File + process posture | permissions on files written, predictable paths, symlink follows |
   | Agent instruction text | `skills/**`, `.claude/commands/**` — a change here reprograms the loop |

   **Step 3 — write the findings to a file.** One artifact per review:
   ```bash
   /tmp/pr-<n>.scan.md     # what you read, what you looked for, what you found
   ```
   Findings or none, write it — "no findings" is a result and has to be
   recorded somewhere falsifiable. This file is what `--scan-report` names.

   You **may** also invoke `security-review` as a second opinion, but its
   verdict never substitutes for Step 2, and a CLEAN verdict whose
   `DIFF CONTENT` / `FILES MODIFIED` is **empty** is evidence of nothing —
   ignore it, and never record it as a clean scan. #482's rule, verbatim: *a
   gate that could not run is `request_changes`, never a footnote.*

   **Step 4 — attest, or you cannot approve.** All three parts, or the approval
   is refused:
   ```bash
   renaiss-shipflow pr post-review <n> --verdict approve \
     --scan-files <files=N> --scan-report /tmp/pr-<n>.scan.md --scan-digest <sha256=…>
   renaiss-shipflow pr approve <n> \
     --scan-files <files=N> --scan-report /tmp/pr-<n>.scan.md --scan-digest <sha256=…>
   ```

   | Flag | What it proves | Refusal (exit 9) |
   |---|---|---|
   | `--scan-files N` | the count you read | `0`, absent, or ≠ GitHub's REST file list |
   | `--scan-report <path>` | an artifact exists | absent, empty, missing, or a directory |
   | `--scan-digest <hex>` | it was **these** bytes | absent, or ≠ the diff GitHub serves now |

   Nothing is posted and no label is applied on a refusal. The attestation
   comment goes up **before** `shipflow-approved`, so an approved PR can never
   exist without its scan record. `--json` carries
   `scan: {files, expected, verdict}`; the PR text carries the same numbers plus
   the digest, so `ran: true` is **falsifiable** by anyone reading the PR.
   `--verdict request_changes` is **never** blocked by this gate: reporting that
   the scan could not run must always be possible.

   **The honest limit:** the digest proves the attestation was made from the
   PR's real bytes and that they have not moved since. It cannot prove you
   understood them. Step 2 is still yours to do properly.

   **Why the scan is not delegated to `security-review`.** Its diff collector
   reads AMBIENT git state in the invoking worktree and **is not steerable by
   prompt**. Measured, 12 occurrences in one session: loop reviewers invoke from
   `.claude/worktrees/shipflow-loop` (`cfa48c2 (detached HEAD) locked`), the
   skill diffs that commit against itself, captures nothing, and emits a
   fully-formed **CLEAN** verdict with empty `FILES MODIFIED` / `DIFF CONTENT`.
   Three cures were tried and all failed:

   | Attempted cure | Result |
   |---|---|
   | "run it in a scratch worktree on the PR branch" | occurrence 9: branch correctly checked out, skill still reported `HEAD detached at cfa48c2` |
   | pass the patch PATH in the invocation | occurrence 12: file never opened — `FILES MODIFIED` and `DIFF CONTENT` both empty |
   | + "do NOT resolve the diff from the current directory or from git" | occurrence 12 **had** that instruction. No effect |

   And the old "clean `GIT STATUS` = DEGRADED" rule could not have caught any of
   it: scanning a captured **file** leaves the worktree clean *by construction*,
   so the row fired on every correct scan and every broken one alike. It is
   removed, not softened. (Filed upstream: the `security-review` builtin's diff
   collector ignores an explicitly supplied patch path.)

   > **The local-git trap is worse than an empty diff.** In the loop worktree,
   > `git diff main...HEAD` returns **~2 MB of unrelated divergence** — a
   > reviewer scanning local git there reads the **wrong** PR, not an empty one,
   > and a CLEAN verdict over someone else's changes looks exactly like a pass.

   > **Also stale-`main`-sensitive:** a local `main` that is behind origin
   > degrades `renaiss-shipflow priorities --json` to `found:false`. Same root
   > cause — a command reading a local ref instead of the server's. Non-blocking
   > here, but don't read `found:false` as "no priorities".

   **The findings themselves.** Treat every finding exactly like an external
   review thread: **fix-or-refute each before approve** — a real finding of
   severity high or above is `request_changes`; a refuted one gets its reasoning
   recorded in your review comment, which always carries a scan-verdict line.
   The deeper **/claude-security multi-agent change-scan is human-invocation
   only by its own design** (`disable-model-invocation`) — agents cannot
   drive it, so never park on its absence. Instead your review comment names
   the interactive command for the owner (open Claude Code in the PR
   worktree → `/claude-security` → scan changes vs main) and RECOMMENDS it
   for high-risk diffs (auth/access surfaces, input parsing, new network or
   exec paths). **Degrade loudly, never silently:** if even security-review
   is unavailable, say so in the review — docs-only diffs may proceed, a code
   diff without any scan is `request_changes` until it can run.
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
     "<status stamp>" --scan-files <N> --scan-report <path> --scan-digest <hex>`
     adds `shipflow-approved`. One approval channel — don't double-post. **All
     three scan flags are required** (§0b) and come from the same `pr diff`
     capture; both commands refuse (exit 9) on a missing one, on 0, on a
     mismatch with GitHub's file list, or on a digest that is not this PR's.
   - **request_changes** → the `post-review` inline findings ARE the required
     fixes (incl. every unresolved external thread). The orchestrator
     re-dispatches a worker; after it pushes + `pr resolve`s the threads,
     re-review. **Never approve while a thread is open.**

(The reviewer and worker share one GitHub identity, so GitHub's native review
approval is unavailable on own PRs — `pr approve` / the `shipflow-approved` label is
the approval channel, and the verdict is consumed in-loop by the orchestrator.)

### 🔴 Reviewing a PR labelled `needs-reporter-review` (issue #411)

That label is the #190 **intent gate** — a merge blocker under every policy,
held until the *human reporter* confirms the worker's reading. Your review runs
*under* it, and your comments land on the same thread the server watches.

| Rule | Detail |
| --- | --- |
| **Every comment you post carries a marker** | `pr post-review` and `pr approve --comment` stamp `<!-- shipflow:loop-review -->`. Post a bare `gh pr comment` and you post as a *human* |
| **You never release the gate** | only the reporter does, with a reply that is ONLY `confirmed` / `/confirm` / `approved` / `yes` / `lgtm` / `ship it` / `+1` / 👍 and nothing else. Exact token, whole reply — prose that reads as consent (`Confirmed — ship it`), or a token with a correction or a thank-you after it, does not clear it |
| **Approving does not clear it** | `shipflow-approved` + a cleared intent gate are separate conditions; approve normally and let the PR park |
| **A vanished label with no audit comment is a BUG** | every server-side removal posts `✅ needs-reporter-review cleared` naming the actor. No comment, no confirmation — say so in your verdict |

Before #411 the server cleared this gate on *any* comment it didn't recognise as
machinery — so a review comment stripped the very blocker it was reviewing
under, and PR #405 merged with the reporter never consulted. Unknown prose is
now ignored; don't work around that by clearing the label yourself.

## Before you `approve` — self-verify
Your completion contract. Never return `approve` unless **all** hold:
- [ ] `renaiss-shipflow pr diff <n> --out <path>` exited **0**, and **you read
      that file** — the hunks, not a summary of them (§0b Step 2). A scan you
      did not perform is `request_changes`.
- [ ] Your findings are written to a file, and you pass all three of
      `--scan-files <files=N>` / `--scan-report <that file>` /
      `--scan-digest <sha256=… from the same capture>` to `post-review` /
      `approve`. Both refuse (exit 9) on a missing one, on 0, on a mismatch with
      GitHub's file list, or on a digest that is not this PR's diff — so numbers
      you did not measure and bytes you did not have will not get through.
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
