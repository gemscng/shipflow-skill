# Loop mode — autonomous issue → PR reconciler

Enter this mode **only** when the user explicitly asks to loop through and fix
issues (e.g. "loop through the issues and fix them", "auto-fix issues"). In this
mode the skill's "Do NOT auto-branch / auto-fix" guardrails are overridden —
auto-branching and fixing *is* the requested intent.

**The model is a reconciler, not a pipeline.** Each tick you first drive *every*
PR/issue you already own one step toward `merged`, and only *then* admit new work
— and only while you're under the WIP limit. State lives in GitHub + ShipFlow
(labels, claims, PR/CI/review status), not in your head, so a stopped loop just
re-reads `inbox --json` and resumes.

**You are an orchestrator; the work runs in subagents.** You (the main session)
stay thin — read compact JSON, dispatch, collect a one-paragraph structured
return. Each issue/PR is handled by a **fresh-context subagent** (the Task tool),
so context never bloats across many items and issues can't cross-contaminate. And
**every issue and every PR passes through the reviewer first** — a subagent that
pulls ShipFlow's feature map for a whole-system view before any fix ships. See the
Roles section.

## Contents

1. **Setup** — one reusable worktree
2. **Policies** — the knobs (`merge-policy`, `require-ci`, `max-fix-attempts`, `wip-limit`, `stale-pr-hours`, `bug-hunt`, `require-review`)
3. **Roles** — orchestrator · reviewer · worker subagents
4. **The cycle** — A reconcile in-flight · B admit new work · C bug sweep · D repeat/stop
5. **Reconcile playbook** — inbox `state` → action
6. **Guardrails**

Sub-references: `loop-worker.md`, `loop-reviewer.md` (role contracts),
`browser-testing.md` (E2E test step), `bug-taxonomy.md` (severity × category +
QA checklist — shared by sweep + reviewer), `qa-report.md` (health score + baseline),
`pr-feedback.md` (resolving review threads).

## Setup — run in a worktree (once, before the cycle)

The loop **always** works in a git worktree, never in the user's live checkout.
Use a **single** worktree, reused for every iteration (not one per issue):

- Prefer the `EnterWorktree` tool with a fixed name (`shipflow-loop`); it creates
  the worktree off the default branch and switches into it. Fall back to
  `git worktree add .worktrees/shipflow-loop -b shipflow-loop/base origin/<default>`
  (ensure `.worktrees/` is gitignored) and `cd` into it.
- If already in that worktree (resuming), reuse it — don't create another.
- All branching, fixing, testing, committing, pushing happen inside this one
  worktree. **Cleanup:** merged `fix/issue-*` branches are pruned automatically
  at merge time by `pr automerge`/`pr merge` (remote via gh `--delete-branch`,
  local via a force-prune that detaches HEAD if the worktree is on the branch).
  At run end — only once no PRs you own are still in flight — tear the worktree
  down: `ExitWorktree`, else `cd` out and `git worktree remove
  .worktrees/shipflow-loop` + `git branch -D shipflow-loop/base`. Surface its
  path + branch first; keep it if you're only pausing/resuming.

**Preflight — test baseline (once).** The loop enforces a test bar, so it needs one
to exist. If the repo has **no test framework** (no `*.config`, no `test/`/`spec/`),
dispatch a worker to bootstrap one before the cycle: research the right framework for
the stack, install it, write 3–5 real tests for the most-changed files, wire a CI
workflow, commit `chore: bootstrap test framework`. Skip if tests already exist or the
user opted out. **The CI workflow half is not optional when `require-ci` is on**
(default): a repo whose CI never runs on PRs can never satisfy the gate and will
deadlock every PR at merge time (issue #305) — bootstrap a PR-triggered workflow
here, or have the user set `require-ci false` before the cycle starts. Without this, an untested greenfield repo has nothing for the worker's
regression tests or the reviewer's CI gate to stand on.

## Policies — the three knobs (set once, then trust them)

How far the loop drives a PR without a human is configured, not hard-coded.
Read them with `renaiss-shipflow config list`; set with `config set <key> <v>`
(env vars `SHIPFLOW_*` override):

| Knob | Default | Meaning |
|---|---|---|
| `merge-policy` | `manual` | `manual` = never auto-merge (park for a human) · `auto-on-green` = merge when CI green **and** approved · `auto-timeout` = green + no objection past `stale-pr-hours` |
| `require-ci` | `true` | CI must be green before a PR is "advanced" / merged |
| `max-fix-attempts` | `3` | CI-fix tries on one PR before escalating to a human |
| `wip-limit` | `10` | max open PRs you own before you stop admitting new work |
| `stale-pr-hours` | `48` | a green, unreviewed PR older than this is `stale` → ping/escalate |
| `bug-hunt` | `true` | when the queue is empty, run a test+QA sweep and file issues for bugs found (Phase C) |
| `bug-hunt-cap` | `5` | max NEW issues the bug sweep may file per run |
| `require-review` | `true` | route every issue (intake) and PR (pre-merge) through the reviewer subagent first |

The real merge guard is the repo's **GitHub branch protection** — even `auto-on-green`
can't merge what GitHub blocks. Approval = a GitHub review approval **or** the
`shipflow-approved` label — which is exactly what the **reviewer** adds via
`renaiss-shipflow pr approve <n>`. So the reviewer's verdict *is* the merge gate.

## Roles — three subagents the orchestrator dispatches

Dispatch each via the **Task tool**. Each gets a fresh context and returns a
compact payload; their heavy work (reading code, diffs, test output) never enters
your context.

- **orchestrator** = you, the main session. Read compact JSON (`inbox`,
  `issue next`, `features`, subagent returns), decide, dispatch, count vs `cap`.
  **Never read source files or diffs yourself** — that keeps your context flat
  across the whole run.
- **reviewer** — the mandatory gate (`require-review`, default on). Pulls
  `renaiss-shipflow features --json` (ShipFlow's feature map) for a whole-system
  view, then reviews an **issue at intake** (validate, map to features, write an
  acceptance brief) and a **PR before merge** (cross-feature impact, regressions,
  meets the brief; approves with `pr approve`). Contract + schema:
  `references/loop-reviewer.md`.
- **worker** — fixes ONE issue end-to-end (branch → fix → test → PR → evidence) in
  its own context, returns `{pr, verified, blocked}`. Also runs reconcile fixes
  (CI, review feedback, rebase). Contract: `references/loop-worker.md`.
  - **Worker model knob:** at the start of each run, read
    `renaiss-shipflow config get loop-worker-model` (env
    `SHIPFLOW_LOOP_WORKER_MODEL` overrides the stored value). If set, pass it
    as the Task tool's `model` on every **worker** dispatch — fix and
    reconcile alike. Workers ONLY: never apply it to the reviewer or QA
    (guardrail below — never downgrade the reviewer). Best-effort: a host
    without per-subagent model support ignores the parameter. Unset → current
    behavior (the host picks per dispatch, per "Match the model to the task").

## The cycle — each tick

### A. Reconcile in-flight work — dispatch a worker per item

Run `renaiss-shipflow inbox --json` (compact — this is all *you* read). For each PR
whose `state` needs action, **dispatch a worker subagent** (Task tool) scoped to
that one PR and collect its return. Loop A until nothing in-flight `needsAttention`:

- `ci_failing` → worker fixes the failing checks (`gh pr checks <n>`) on the branch
  and pushes. Track attempts across ticks; after `max-fix-attempts` still red →
  `renaiss-shipflow issue escalate <issue> --reason "CI red after N attempts: …"`.
- `changes_requested` / `review_comments` → worker addresses every comment —
  **including async external bot reviewers** (gemini-code-assist, coderabbit); list
  them with `renaiss-shipflow pr reviews <n> --json`, fix each, push, reply, and
  **resolve the thread** (`pr resolve <n> --thread <id>`). Then **re-dispatch the
  reviewer** (the gate re-runs after any change). Ambiguous/conflicting → escalate.
- `approved_ready` → the reviewer already added `shipflow-approved` (Phase B step 4)
  → `renaiss-shipflow pr automerge <n> --json` (merges only if `merge-policy` + CI +
  approval allow **and no review thread is unresolved**; parks on `manual`). The
  unresolved-thread block is a hard gate — an approved PR with an open bot comment
  will not merge.
  **`"unsatisfiable": true` in the automerge JSON = ESCALATE, do not re-poll**
  (issue #305). It means a blocker can never clear by waiting — today: `require-ci`
  is on but the repo has NO CI configured. Re-running the same tick can only give
  the same answer, so `issue escalate <issue> --category external-dependency` ONCE
  with the two remedies as the recommendation (add a workflow that runs on PRs ·
  `config set require-ci false`), then move on. Never leave a PR spinning on a
  blocker that has no path to clearing.
- conflict → worker runs `renaiss-shipflow pr sync <n>` on the branch (exit 6 =
  unresolved → escalate).
- `stale` → nudge once / escalate if blocked. `ci_pending` / `awaiting_review` →
  **parked, no action** (re-checked next tick; don't busy-wait).

A PR becomes `approved_ready` **only** because the reviewer approved it — never
hand-add `shipflow-approved`. For each in-progress issue with a `newComment`, a
worker reads + acts. **A human reply on a `needs-human` issue is what unblocks it** — but only a
*decision*, and only from a person (not the loop's own `🚧 **Needs a human**` /
evidence comments):

- **Trigger** — a reply that green-lights the work ("proceed / go ahead / just work
  on it / do it", or similar), OR a **structured per-decision reply** (see next
  bullet). A question- or chatter-only reply with no decision stays escalated.
- **Structured per-decision answers** — when the escalation posed **numbered
  decisions**, a human can answer them individually instead of a blanket proceed:
  newline lines `N: answer` (e.g. `1: frankfurter`, `3: me`) or the comma form on
  one line (`1: frankfurter, 3: me`). Parse the reply with `parseDecisionReplies`
  (`apps/renaissshipflow-cli/src/escalation-format.ts`) and map each answer to the
  escalation's numbered decision. Mark answered items resolved by editing the live
  🚧 comment in place with the **existing** `renaiss-shipflow issue escalate <n>
  --update` (landed in PR #59 — do **not** add a new CLI command or server surface):
  rewrite the ask down to the still-open decisions, each settled item marked
  "resolved". **Clear `needs-human` only when ALL decisions are answered** — a partial
  reply stays escalated with the remaining items (and keeps its claim). Bake the
  answered decisions into the acceptance brief as **settled** — same stickiness rules
  as `loop-proceed` (authoritative across re-picks / restarts; never re-ask a decision
  the human already answered). When every decision is answered, follow **Act** below.
- **Act** — remove `needs-human`; **add the durable marker label `loop-proceed`** (the
  override's persistent record — the one signal a **fresh-context** reviewer reads on a
  later re-pick; an in-head "settled decision" doesn't survive a new subagent or a
  restart, the label does). Treat the reviewer's prior `reject` as **overruled**. Bake
  the guidance into the acceptance brief as settled, then hand straight to a worker
  (Phase B step 3) — carving the smallest sensible slice if the issue is big rather
  than asking again; the reviewer then gates the resulting PR (step 4).
- **Sticky** — authoritative **across re-picks / restarts**, not just this tick: don't
  re-run the intake validity gate, and **never re-escalate the answered question**.
  Even if the issue re-enters via `issue next`, the `loop-proceed` label makes the
  reviewer's intake (Mode 1) skip the validity-reject and go straight to the brief.

### B. Admit new work — under the WIP limit, every issue reviewed first

If (open PRs you own) ≥ `wip-limit`, **skip B** (drain A instead). Otherwise, while
PRs-opened-this-run < `cap`, admit ONE issue — each step a fresh subagent:

1. **Pick** — `renaiss-shipflow issue next --json` (claims next open/unclaimed,
   priority → severity → newest; optional `--label bug`; skips `needs-human`/claimed).
   **Exit 4** / `issue: null` → nothing to admit.
   - **Dependency check:** blocked-by / depends-on an unmerged `#X` →
     `renaiss-shipflow issue wait <n> --on <#X> --reason "…"` and pick the next.
     NOT `escalate` — a dependency is a timer, not a human decision: `wait`
     labels `⏳ waiting-on`, and `issue next` re-admits the issue automatically
     once the dependency merges/closes (cross-repo refs like `owner/repo#N`
     work). Reserve `escalate`/`needs-human` for questions only a person can
     answer.
   - **Missing capability/secret/access:** when you escalate for something the loop
     can't grant itself (a missing secret, an access grant, a tool/permission, or a
     governance call), ALSO file `renaiss-shipflow capability request --class <capability|access|secret|policy> --title "…" --why "…" --issue <n>` so the ask lands in the standing queue an operator works through (pairs with `docs/PRIORITIES.md` governance).
2. **Reviewer — intake** (mandatory; `require-review`). Dispatch the reviewer
   subagent with the issue + triage. It pulls `renaiss-shipflow features --json`,
   consults the **standing priorities doc** (`renaiss-shipflow priorities --json`
   → `docs/PRIORITIES.md`: a greenlit work class + normal slice proceeds without
   per-epic sign-off; deploy-blast-radius work always needs per-item sign-off;
   off-doc work escalates as today — `loop-reviewer.md` Mode 1 step 1b),
   validates the issue, maps it to the features it touches, and returns an
   **acceptance brief** (what "done" means + which features to regression-check).
   Reviewer rejects (invalid / duplicate / needs a human) → `issue escalate` and
   pick the next. **If the brief is a partial slice with deferred parts, file each as
   a follow-up sub-issue now** — `renaiss-shipflow issue create --title "…" --body
   "Part of #<n>: …"` — *before* dispatching the worker, so deferred scope is tracked,
   not dropped. See `references/loop-reviewer.md`.
   **Post the brief's "Unknowns & assumptions" section on the issue** as a comment
   ending with `<!-- shipflow:loop -->` (so it never trips the needs-human
   auto-unblock) before dispatching the worker: every assumption the reviewer
   made is now visible where the human can veto it for the cost of one reply —
   and a reply IS the veto (Phase A treats it as the decision).
3. **Worker — fix** Dispatch the worker subagent with the issue + triage + brief.
   It pulls the **feature map** itself (`features --json`) for file boundaries +
   neighbouring features, so the heavy data stays in its context, not yours. In
   the loop worktree it: branches (`fix/issue-<n>-<slug>` off `origin/<default>`),
   fixes, runs project tests **and** a diff-scoped E2E browser pass with before/after
   screenshots + a **health score** (`references/browser-testing.md`), **adds a
   regression test** for the bug, opens the PR with `renaiss-shipflow pr create --json`
   (full fix → `Closes #N`; partial slice → `Part of #N`, never a closing keyword —
   see `loop-worker.md` §5),
   and attaches evidence with the health delta (`issue evidence <n> --pr <pr> --file …`).
   Returns `{pr, verified, regressionTest, healthDelta, blocked}`. Unverified/blocked
   → `issue escalate`, no PR.
4. **Reviewer — PR review** (mandatory). Dispatch the reviewer on the new PR with
   the brief. It first checks **external reviews** (`renaiss-shipflow pr reviews <n>
   --json` — unresolved threads incl. bot reviewers), then pulls `features --json` +
   the diff for a **whole-system review** (cross-feature impact, regressions, meets
   the brief), posts the review, and verdicts:
   - **approve** — only with **no unresolved review threads**, brief met, CI green →
     `renaiss-shipflow pr approve <pr> --comment "<summary>"` (adds `shipflow-approved`;
     it refuses, exit 7, if any thread is still open). Now `approved_ready` for A.
   - **request changes** → list every fix incl. each external thread; re-dispatch a
     worker to fix + `pr resolve` the threads, then re-review. Never approve until
     all threads are resolved. External reviewers are async — if none have posted
     yet, leave the PR parked; A's next tick catches the late review.

Do **not** `issue done` here — the claim stays until the PR merges (A's automerge
releases it), keeping the issue out of `issue next` while its PR is in flight.

### C. Bug sweep — when there's nothing left to fix, hunt for new bugs

When B's `issue next` returns exit 4 / `issue: null` **and** A is clean (no PR
needs action), don't stop yet. If `bug-hunt` is on (`config get bug-hunt`, default
**true**), turn the idle time into QA that *refills* the queue:

1. **Sweep methodically** (dispatch a QA subagent so its output stays out of your
   context) — run `renaiss-shipflow test` and **`renaiss-shipflow regression --wait
   --json`**. The latter is ShipFlow's own **E2E test_runner**: it *executes* the
   generated API/UI test cases against the project's configured test environment and
   blocks until they finish. Gate on the executed result — `--wait` exits non-zero
   and `result.status` is `failure` when real E2E cases fail; treat each failed test
   case as a **reproduced bug** to file in step 2 (it already has repro: name +
   api/ui hint from the run). `success`/`skipped` (or "no test environment
   configured", where it degrades to a manual checklist only) → no E2E bugs to file.
   Then a real-browser QA sweep. Use `renaiss-shipflow features --json` to prioritise
   `high` `test_priority` features, and run the **per-page checklist** on each
   (`references/bug-taxonomy.md` §4: click everything, fill forms, check empty/error
   states, console after each interaction, responsive, auth boundaries). Compute the
   **health score** and diff it against the stored baseline (`references/qa-report.md`)
   — a score drop since last sweep means something regressed. Screenshot anything broken.
2. **File genuine bugs as issues** — for each bug you can **actually reproduce**
   (retry once to confirm), classified with a **severity + category** from the
   taxonomy, and not already an open issue (dedupe via `renaiss-shipflow issues list
   --json` — match by title/area; skip anything labelled `auto-qa` you already filed):
   `renaiss-shipflow issue create --title "<bug>" --body "<repro + expected vs actual>"
   --label bug --label auto-qa --label "severity:<…>" --label "area:<…>" --json`
   (`bug-taxonomy.md` §3). Attach evidence with `issue evidence <n> --file <shot>`,
   and update the baseline. **Only file what you reproduced** — no speculative or
   duplicate issues.
3. **Feed the loop**: if the sweep filed ≥1 new issue → **go back to A** (the loop
   now fixes the bugs it just found). If it found **nothing new** (clean, or only
   dupes) → *that's* the real stop.

Bound it: file at most `bug-hunt-cap` new issues per run (default 5); the PR `cap`
still applies to fixes. Turn it off with `config set bug-hunt false` (or
`SHIPFLOW_BUG_HUNT=false`) — then an empty queue just stops.

### D. Repeat / stop

Loop A→B→C. The run ends only when PRs-opened-this-run has hit `cap`, **or** the
queue is empty AND the bug sweep (C) surfaced nothing new (or `bug-hunt` is off).
`cap` precedence: a `cap=N` token the user passed (`cap=all` drains the queue),
else `SHIPFLOW_LOOP_CAP`, else **5**.

## Reconcile playbook (inbox `state` → action)

| `state` | What it means | Action |
|---|---|---|
| `ci_failing` | a check is red | fix on branch, push; escalate after `max-fix-attempts` |
| `changes_requested` | reviewer wants changes | pr-feedback → fix → push → reply |
| `review_comments` | unaddressed comments | pr-feedback (may already be handled) → reply |
| `ci_pending` | checks running | park — re-check next tick |
| `approved_ready` | approved + CI green | `pr automerge` (parks on `manual`) |
| `stale` | green, unreviewed, old | nudge the PR; escalate if blocked on a human |
| `awaiting_review` | green, no feedback yet | park |

## Guardrails

- **The reviewer gate is mandatory** (`require-review`): no worker starts an issue
  without an intake brief, and no PR is `approved_ready`/merged without the reviewer
  posting a review and running `pr approve`. The reviewer always pulls
  `features --json` first — it reviews against the whole system, not just the diff.
- **Orchestrator context discipline:** dispatch, don't do. You read only compact
  JSON and one-line subagent returns — never open source files, diffs, or test logs
  in the main session. That's what lets the loop run `cap=all` without context bloat.
- **Reap finished subagents:** a subagent that has returned stays resident as
  "background work" until the session exits — over a long run, dozens of done
  workers/reviewers pile up in the exit dialog and bury genuinely live work.
  Once you've read a subagent's return payload (and won't message it again),
  release it: `TaskStop` its task, or send it a `shutdown_request` if it runs
  as a named teammate. Cleanup is part of finishing the tick, not optional
  hygiene.
- **Match the model to the task.** Token cost lives mostly in subagents, and
  most dispatches don't need the strongest model. When your host supports a
  per-subagent model choice: **mechanical work** (CI fix with a clear error,
  rebase/conflict on lockfiles, thread replies, doc/comment edits) → a
  fast/cheap tier; **implementation with a structured brief** → the standard
  tier; **the reviewer and anything ambiguous or security-adjacent** → the
  strong tier, always. Never downgrade the reviewer to save tokens — measured
  result from Superpowers 6: cheap reviewers defend the same failure families
  they should catch. If unsure, use the standard tier; a wrong cheap-tier pick
  costs a re-dispatch, which erases the saving. The user can pin the worker
  tier: `renaiss-shipflow config set loop-worker-model <model>` (env
  `SHIPFLOW_LOOP_WORKER_MODEL` wins) — read it once per run and pass it as the
  Task `model` on **worker** dispatches only; it never touches the reviewer,
  and hosts without per-subagent model support ignore it (best-effort).
  Unset → this tier-matching guidance as-is.
- **Narrate in one line.** Per dispatch, emit exactly one narration line —
  `tick 3: #42 worker → PR #97 opened` — never a paragraph. Terse narration is
  a measured ~50% output reduction on the orchestrator side with zero
  information loss.
- **Optional persistence:** the user can pair this loop with `/goal "drain the queue
  and merge everything mergeable"` so the orchestrator won't stop early — belt-and-
  suspenders on top of "run to the cap." `/goal` is an **orchestrator-only** tool —
  never put a stop-hook/goal inside a subagent; subagents must *return* (via their
  self-verify contract) for the loop to progress. Quality comes from the subagent's
  completion contract + the reviewer gate, not from blocking a subagent's return.
- **`pr automerge` is the only merge path the loop uses** — it self-gates on
  `merge-policy`. With the default `manual` it never merges; approved PRs pile up
  cleanly for a human. **Never** call bare `pr merge` or cut a `release` without
  explicit human confirmation. In a **spawned / headless session** (OpenClaw,
  Hermes, cron — see SKILL.md "Spawned / headless sessions") no human is there to
  confirm, so neither runs: `pr automerge` + `merge-policy` is the whole merge
  story, and `release` is skipped (escalate if a release is genuinely needed).
- **Escalate, don't spin — but split before you escalate.** Escalation is a **last
  resort**, not the default for "this is big." For an item that's merely large,
  open-ended, or ambiguous, **carve a bounded, value-adding slice** and defer the
  rest as follow-up sub-issues — the **orchestrator** files those with
  `renaiss-shipflow issue create` linked to the parent (`Part of #N`) at admit time,
  before the slice PR opens — rather than handing the whole thing to a human.
  Reserve `issue escalate` for a genuine **hard blocker** — missing
  secrets/credentials or external setup the loop can't do, a security-/trust-critical
  surface that can't be validated autonomously, an absent spec/design doc the issue
  depends on, a hard dependency on an unmerged issue, or a duplicate/invalid issue.
  `issue escalate` may return `autoResolved: true` (precedent auto-apply, server
  flag-gated): a stored human answer to the SAME question was reused — the
  disclosure comment on the issue carries it, no `needs-human` was applied, and
  the claim is KEPT. Treat it exactly like a human reply: implement that answer
  and continue the issue; never re-escalate the answered question. A human
  `undo` reply reverses it (the server then applies `needs-reporter-review`).
  A single hard/blocked/unverifiable item → `issue escalate` (labels `needs-human`,
  keeps the claim, comments why) and move on. It never ends the run; you never pause
  mid-run to ask for direction.
  Write `--reason` action-first — `### 👤 Action needed` (numbered steps, ending
  "remove the `needs-human` label") → `### Why it's blocked` → optional `### Ready once
  unblocked` — and pass `--category` (standard why-a-human rationale) plus `--owner`
  when the issue names one (else the CLI resolves `signoff-owner` config → issue
  author). Only Action needed renders unfolded (the CLI collapses the other
  sections into `<details>` and rejects action lines over 30 words — keep each
  step one short line); never ask an open question without a `**Recommendation:**`
  line — the CLI lints and rejects; full contract in `loop-reviewer.md` Mode 1.
- **The priorities doc is human-edited only.** `docs/PRIORITIES.md` — the
  standing work-class greenlist intake consults (`renaiss-shipflow priorities`)
  — is the owner's policy (#211): the loop reads it, **never edits it**.
  Propose a change via `issue escalate` with a recommendation; a human commits
  the edit. And greenlit never overrides safety: deploy-blast-radius work
  (revert/release/config paths) always needs per-item sign-off.
- **Escalations shrink as slices land.** When a merged slice settles one of an
  escalated parent's decisions, don't leave the stale ask standing: re-run
  `issue escalate <parent> --update …` with the remaining ask only (settled items
  marked "resolved by #N"), and keep the parent body's decision list as a
  task-list checklist checked off the same way. One live 🚧 comment per issue —
  `--update` edits it in place instead of stacking a new banner.
- **Mark loop comments on escalated issues.** The server auto-clears
  `needs-human` when a *human* replies (it recognizes loop machinery by the 🚧
  banner and `<!-- shipflow` markers, not by author — the loop comments under
  the operator's account). So any comment the loop posts on a `needs-human`
  issue *without* resolving it (progress notes, slice links) MUST end with
  `<!-- shipflow:loop -->`, or the comment itself will un-park the issue.
  `issue escalate` output needs no marker — the 🚧 banner already exempts it.
- Reconcile (A) acts only on **your own** PRs and claimed issues. Don't touch
  others' PRs/issues unless asked.
- Because blocked/escalated issues keep their claim and carry `needs-human`,
  `issue next` advances down the priority list. **A human reply on such an issue
  brings it back in** — the server clears `needs-human` on the reply
  automatically, and Phase A treats the reply as the decision: implement it,
  never re-escalate the question they answered (add `loop-proceed` per the
  human-reply rule above). When B's pick returns null **and** A is clean, the
  bug sweep (C) runs; the run ends only once C also comes up empty.
- **Bug sweep files real bugs only.** Phase C may only file an issue for a bug it
  **reproduced**, never a duplicate of an open issue, always labelled `auto-qa`,
  and at most `bug-hunt-cap` per run. It never files speculative/style nitpicks.
- **Self-regulate — WTF-likelihood.** Beyond the flat caps, watch a running signal
  that the loop is thrashing. Start at 0%; add +15% per revert, +20% when a fix
  touches files unrelated to its issue, +5% per fix touching >3 files, +10% if all
  that's left is `low` severity. **Above ~20% → stop and summarize** instead of
  pressing on; a high revert rate or unrelated-file churn means the loop is guessing.
  This is a smarter brake than `max-fix-attempts` alone, which only counts retries on
  one PR.
- **Health gate on merge.** A PR whose evidence shows a **negative health delta**
  (`references/qa-report.md`) is treated like an unresolved thread: the reviewer
  won't approve it and `pr automerge` won't merge it, regardless of `merge-policy`.
- **At the cap or an empty queue:** summarize — PRs opened, merged (if policy
  allowed), parked-awaiting-review, and escalated (with reasons) — then ask
  whether to continue beyond the cap, raise the merge policy, or merge anything by
  hand. Releasing escalated claims and any `pr merge`/`release` still need explicit
  confirmation. (That "ask" applies only to a `once`/single-pass run; **by default
  the loop is continuous** — don't ask, post the one-line summary and end the turn,
  leaving the recurring trigger to resume the next pass after its dormancy. A
  **spawned / headless session** never asks either — it reports via prose and ends.)
- **Continuous mode (default).** `/shipflow-loop` keeps the loop running: one full
  pass, then **dormant ~15 min**, then another pass, indefinitely — so new issues /
  PR-CI changes are picked up without re-invoking. At the start of the run, create a
  recurring trigger with `CronCreate` (default every 15 min, an off-`:00`/`:30`
  minute) whose prompt is the **fully-qualified** command **`/shipflow:shipflow-loop`**
  — **not** the bare `/shipflow-loop`, which a scheduler-fired prompt can't resolve
  (it errors with `Unknown command: /shipflow-loop`). Always use the exact
  `<plugin>:<command>` form you were invoked as. Then run the first pass now; re-entry
  is idempotent (a tick sees the existing job via `CronList` and skips re-creating it,
  so they never stack), and each tick is an unattended pass that ends without asking
  (empty queue is fine — it keeps checking). `/shipflow:shipflow-loop once` runs a
  single pass with no trigger; stop an active loop with `/shipflow:shipflow-loop stop`
  (`CronDelete` the job), then do the worktree cleanup. The trigger fires only while
  Claude Code is running/idle and may
  be session-scoped (cmux) with a ~7-day expiry; for a true always-on reconciler use
  an external scheduler (cron / launchd / GitHub Actions) driving
  `/shipflow:shipflow-loop once`. Non-Claude harnesses (Codex CLI) have no
  CronCreate at all — the external-scheduler form is their ONLY continuous
  mode, and subagent dispatch degrades to inline roles (`references/codex.md`).

## Message style — everything you write on GitHub (comments, PR bodies, issue bodies)

**This is the one authoritative copy.** `loop-worker.md`, `loop-reviewer.md`, and
`pr-feedback.md` point here instead of restating it — edit the contract here only.

Humans skim these on a phone, and the human is the pipeline's bottleneck: every
message exists so a person can **judge it in seconds**. Graphics first, words last.

For each piece of information, use the FIRST format on this list that fits.
Prose is the fallback, never the default:

1. **Table** — ≥3 parallel facts: files → changes, options → risks, checks → results.
2. **`mermaid` block** — any flow, dependency, sequence, or state change of >2 steps
   (GitHub renders mermaid natively). A small `flowchart LR` beats a paragraph of "then".
3. **Checklist** — `- [x]` verified / `- [ ]` pending. Judgeable at a glance.
4. **Meter** — any ratio or progress: `▰▰▰▱▱ 3/5 merged`.
5. **Image** — screenshots, recordings, rendered cards as evidence. Seeing beats reading.
6. **Bullets** — only what no visual can carry: one point per bullet, ≤12 words.

Rules that hold for every format:

- Lead with the outcome: verdict / fixed / blocked — then the visuals.
- `path:line`, numbers, and short quotes beat descriptions.
- Asking a human to choose? Render a **decision table** — `| # | Decision | Recommendation |`
  — whose `#` matches the `N: answer` reply protocol. Every option row carries the
  loop's recommendation; never a bare open question.
- Table cells read in one breath: the ≤30-word visible-line cap applies **per cell**.
- Detail nobody needs in order to act folds into `<details>`; it never renders unfolded.
- Cut openers ("I have reviewed…"), hedges, and restatements of the diff.
- If a bullet needs a second clause, split it or cut it.

GitHub collapses single newlines into one paragraph — put a **blank line
between every section** or bold-led line, and write enumerations as real
markdown lists (one item per line), never inline `1. … 2. …`.

PR body template (sections, all visual-first, blank line between each):
`Closes #N` (full fix) / `Part of #N` (slice) · **Root cause** ≤3 bullets, `mermaid`
if the failure is a flow · **Changed** table (file → what) · **Testing** checklist
with numbers · **Evidence** images/links.

Issue body template — exactly this shape (blank lines are load-bearing):

```
**Repro**
1. <step>
2. <step>

**Expected** <one line>

**Actual** <one line>

**Impact** <one line> · severity:<level>

**Evidence** <links>
```

Nothing else.

### Commit messages: invoke the smart-commit skill

**Create every loop commit by INVOKING the bundled `smart-commit` skill** — the
Skill tool with `smart-commit` (`skills/smart-commit`), not a hand-written
`git commit`. The skill analyzes the staged diff, splits it into atomic logical
units, and writes an Angular conventional message for each. Run it; let it do
the categorize / split / format. This is the one authoritative copy;
`loop-worker.md` and `pr-feedback.md` point here.

What the skill produces (know the shape so you can sanity-check its output):

- **Format**: `type(scope): subject` — `feat`/`fix`/`docs`/`refactor`/`test`/
  `perf`/`chore`/`ci`/`build`/`style`; imperative subject, no capital, no period,
  ≤50 chars; body wrapped at 72 explaining *what and why*; footer carries the
  `Closes #N` / `Part of #N` reference (matching the PR body).
- **Atomic**: one logical unit per commit — new-construct / modification /
  config / docs / refactor / bug-fix / test each split out; the regression test
  may ride with its fix (step 4).
- **Pre-commit**: lint + format clean before committing (step 4's tests satisfy
  the skill's test gate).
- **No AI-attribution trailer** — the skill's own default; loop commits keep it
  (owner decision, issue #279). The footer is just the issue reference;
  loop-authorship stays traceable via the branch, PR, and the loop's account.

**One autonomous adaptation** (the loop has no human; the skill assumes one):
**skip the human-confirm gate.** smart-commit's "present plan, await
confirmation" step has no one to answer — execute the plan the skill produced
directly; the reviewer gate and your own tests are the confirmation. Never block
waiting for a human that isn't there (the Spawned/headless posture in SKILL.md).
Everything else the skill says applies as written.

Do NOT edit the vendored `skills/smart-commit` skill to encode this — it stays
re-syncable; the one autonomous adaptation lives here.
