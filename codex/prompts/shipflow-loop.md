---
description: Run the ShipFlow autonomous issue→PR reconciler — continuous by default (re-checks every ~15 min); pass `once` for a single pass
---

Enter ShipFlow **Loop mode**: a reconciler that drives every issue/PR you own
toward `merged`. The usual "don't auto-branch / auto-fix" guardrails are lifted.
Full details: `references/loop-mode.md`. Honour the policy knobs (`renaiss-shipflow
config list`): `merge-policy` (default `manual`), `require-ci`, `max-fix-attempts`,
`wip-limit`, `stale-pr-hours`, `require-review`.

**You are the orchestrator.** Stay thin — read only compact JSON, and **dispatch
each issue/PR to a fresh subagent** (Task tool) so context never bloats across
items. Two roles: a **worker** fixes one item (`references/loop-worker.md`); the
**reviewer** is a mandatory gate that pulls `renaiss-shipflow features --json` (the
feature map) and reviews **every issue at intake and every PR before merge**
(`references/loop-reviewer.md`).

**Arguments** (`$ARGUMENTS`): **continuous mode is the default** — the loop re-runs on
an interval (default `15m`; override with `watch=<dur>`) until stopped (see *Continuous
mode* below). An `once` token = run a single pass and stop, no trigger (the old
one-shot behavior). A `stop` token = stop continuous mode (delete the trigger). A
`cap=N` token = how many PRs to open per pass before pausing (`cap=all` drains the
queue); anything else is an `issue next` filter (e.g. `--label bug`). No `cap=` →
`$SHIPFLOW_LOOP_CAP`, else **5**.

**Setup — one reusable worktree** (never the live checkout): prefer the
`EnterWorktree` tool named `shipflow-loop`, else `git worktree add
.worktrees/shipflow-loop -b shipflow-loop/base origin/<default>` and `cd` in. Reuse
if it exists; all work happens inside it.

Each tick:

**A. Reconcile in-flight first** — `renaiss-shipflow inbox --json` classifies each
open PR into a `state`. Act, then re-run A until nothing `needsAttention`:
- `ci_failing` → fix on its branch, push; after `max-fix-attempts` still red →
  `renaiss-shipflow issue escalate <issue> --reason "…"`.
- `changes_requested` / `review_comments` → `references/pr-feedback.md` (fix every
  general + inline comment, push, **reply on the PR**; note the issue if scope shifts).
- `approved_ready` → `renaiss-shipflow pr automerge <n> --json` (merges only if
  `merge-policy` + CI + approval allow; exits 5 and parks otherwise — on `manual`
  it always parks, which is correct). On merge it auto-cleans the branch — remote
  via gh `--delete-branch`, local via a force-prune (detaches HEAD if the loop
  worktree is sitting on it) — so no stale `fix/issue-*` branches pile up.
- conflict reported → `renaiss-shipflow pr sync <n>` on its branch (rebase); exit 6
  (unresolved) → escalate.
- `stale` → nudge once / escalate if blocked. `ci_pending` / `awaiting_review` →
  park, no action.
- in-progress issue with a `newComment` → read (`gh issue view <n> --comments`) + act.
- **`needs-human` issue with a human reply** — a new comment from a person (i.e. NOT
  one of the loop's own `🚧 **Needs a human**` / evidence comments) is the **decision
  that unblocks it**. Treat it as settled: **remove the `needs-human` label**, build
  the acceptance brief with the human's guidance baked in as a fixed decision, and
  hand it straight to a **worker** (Phase B step 3) to implement — then the reviewer
  gates the resulting **PR** (step 4) as normal. Do **NOT** re-run the intake
  validity gate or re-reject on the blocker the human just answered, and do **not**
  re-escalate. (If the reply is only a question/chatter with no decision, leave it
  escalated.)

**B. Admit new work only under the WIP limit** — if (open PRs you own) ≥
`wip-limit`, skip B. Else while PRs-this-run < `cap`, admit ONE issue (each step a
subagent):
1. **Pick** — `renaiss-shipflow issue next --json` (priority→severity→newest; skips
   `needs-human`/claimed). Exit 4 / `issue: null` → nothing to admit. Dependency:
   blocked-by an unmerged `#X` → `issue escalate` + next.
2. **Reviewer — intake** (mandatory): dispatch the reviewer; it pulls `features
   --json`, validates + maps the issue to features, returns an acceptance brief.
   Reject (invalid/dup/needs-human) → `issue escalate` + next.
3. **Worker — fix**: dispatch the worker with issue + triage + brief → branch, fix,
   tests + **E2E browser** with before/after screenshots, `pr create --json` (links
   the issue via `Closes #N`), `issue evidence <n> --pr <pr> --before <before.png>
   --after <after.png>` (screenshot evidence must be a before+after pair). Returns
   `{pr, verified, blocked}`. Unverified/blocked → `issue escalate`, no PR.
4. **Reviewer — PR review** (mandatory): dispatch the reviewer on the new PR; it
   checks external reviews (`renaiss-shipflow pr reviews <pr> --json` — unresolved
   threads incl. bots like gemini-code-assist), pulls `features --json` + the diff
   for a whole-system review, posts it, then **approve** (only with no unresolved
   threads, brief met, CI green) → `renaiss-shipflow pr approve <pr> --comment "…"`
   (refuses while threads are open), or **request changes** → re-dispatch a worker to
   fix + `pr resolve` the threads, re-review. Do **not** `issue done` — the claim
   stays until the PR merges. (`pr automerge` also hard-blocks while any thread is
   unresolved.)

**C. Bug sweep — when the queue is empty** (B's `issue next` exits 4 **and** A is
clean): if `bug-hunt` is on (default), run `renaiss-shipflow test` + `regression
--json` + a real-browser QA sweep (`references/browser-testing.md`). For each bug
you **reproduce** that isn't already an open issue (dedupe via `issues list
--json`), file it: `renaiss-shipflow issue create --title "…" --body "<repro>"
--label bug --label auto-qa --json` (+ attach evidence). Filed ≥1 new issue → back
to **A**; nothing new → real stop. Cap: `bug-hunt-cap` (default 5); reproduced bugs
only, never duplicates.

**D. Repeat** A→B→C until PRs-this-run hits `cap`, **or** the queue is empty and the
bug sweep found nothing new (or `bug-hunt` is off).

**Continuous mode (default)** — unless you pass `once`, the loop keeps running: do
one full pass (A→B→C→D), then go **dormant ~15 min** and run the pass again,
indefinitely, so newly-filed issues and PR/CI changes get picked up without you
re-invoking. Set it up once, idempotently, at the start of the run:
- Check `CronList`; if no shipflow-loop job exists, `CronCreate` a **recurring** job
  at the interval (default every 15 min — pick an off-`:00`/`:30` minute, e.g.
  `7,22,37,52 * * * *`) whose prompt is the **fully-qualified** command
  **`/shipflow:shipflow-loop`** — **not** the bare `/shipflow-loop`, which a
  scheduler-fired prompt can't resolve (it errors with `Unknown command:
  /shipflow-loop`); always use the exact `<plugin>:<command>` form you were invoked
  as. Then run the first pass now. Re-entry is **idempotent** — a tick sees the
  existing job via `CronList` and skips re-creating it, so crons never stack.
- Each tick is one ordinary pass — it ends with a one-line summary and **does not
  pause to ask**; the next tick resumes after the dormancy. An empty queue is fine:
  it keeps checking. Reuse the one loop worktree across ticks (don't tear it down
  between passes).
- **`once`** runs a single pass and stops — no trigger created (the old one-shot
  behavior). **Stop** an active continuous loop with `/shipflow:shipflow-loop stop` →
  `CronDelete` the job, then do the end-of-run worktree cleanup. Always stop the loop
  before tearing down the worktree.
- **Caveat:** the trigger fires only while Claude Code is running and the REPL is
  idle, and in some environments (e.g. cmux) it is session-scoped and auto-expires
  after ~7 days. For a true always-on reconciler independent of this session, drive
  `/shipflow:shipflow-loop once` from an external scheduler (system cron / launchd /
  GitHub Actions) instead.

**Guardrails:** the reviewer gate is mandatory — no PR is `approved_ready`/merged
without the reviewer's `pr approve`. Orchestrator stays thin: dispatch subagents,
never read source/diffs/logs yourself. `pr automerge` self-gates on `merge-policy` —
it's the only merge path; **never** bare `pr merge` or `release` without explicit
confirmation. Escalate, don't spin or pause mid-run. Act only on your own PRs/issues.
At the cap or empty queue: summarize as ONE emoji-coded count line the reader
judges at a glance — `✅ N merged · 🔀 N opened · ⏸ N parked (reason) · 🚧 N
escalated (reason)` — per the graphical-first Message style (`loop-mode.md`). By
default (continuous mode) don't ask — post that summary line and end
the turn, leaving the next tick to resume after the dormancy; only with `once` then
ask whether to continue, raise the policy, or merge by hand.

**Cleanup at run end** (only when truly stopping, not pausing mid-run/resuming):
once no PRs you own are still in flight, tear down the loop worktree so it doesn't
linger — `ExitWorktree` (if you entered via it), else `cd` out and `git worktree
remove .worktrees/shipflow-loop` + `git branch -D shipflow-loop/base`. Per-issue
`fix/issue-*` branches are already pruned at merge time (see `approved_ready`); this
removes the one shared worktree + its base branch. Skip if any of your PRs are still
open (the worktree may hold work in progress).

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-loop.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
