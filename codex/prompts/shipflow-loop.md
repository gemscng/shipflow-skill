---
description: Run the ShipFlow autonomous issue→PR reconciler — continuous by default (re-checks every ~15 min); pass `once` for a single pass
---

Enter ShipFlow **Loop mode**: a reconciler that drives every issue/PR you own
toward `merged`. The usual "don't auto-branch / auto-fix" guardrails are lifted.
**This file covers invocation only** — argument parsing and the continuous-mode
trigger. The loop's semantics are canonical in
`skills/shipflow/references/loop-mode.md`; every step below points at that
file's real section headings (§) — follow them there, never from memory.

## Arguments (`$ARGUMENTS`)

**Continuous mode is the default** — the loop re-runs on an interval (default
`15m`; override with `watch=<dur>`) until stopped (see *Continuous mode* below).

| Token | Meaning |
|---|---|
| `once` | run a single pass and stop, no trigger (the old one-shot behavior) |
| `stop` | stop continuous mode (delete the trigger) |
| `watch=<dur>` | override the re-run interval (default `15m`) |
| `cap=N` | how many PRs to open per pass before pausing; `cap=all` drains the queue |
| `concurrency=N` | max issues/PRs worked at once (#744); `concurrency=1` = fully serial |
| anything else | an `issue next` filter (e.g. `--label bug`) |

**Cap precedence:** a user `cap=N` token → `$SHIPFLOW_LOOP_CAP` → **5**.
**Concurrency precedence:** a user `concurrency=N` token →
`$SHIPFLOW_LOOP_CONCURRENCY` → **3**. Not a CLI preference — do not
`config get` / `config set` a `loop-concurrency` key (unknown key, exit 1).

## The tick — skeleton (each step lives in loop-mode.md at the § named)

1. **Setup, once** — orchestrator worktree, never the live checkout: prefer
   `EnterWorktree` named `shipflow-loop`, else `git worktree add
   .worktrees/shipflow-loop -b shipflow-loop/base origin/<default>`; reuse if it
   exists. Serial claims/inbox/merges run here. Workers never checkout here —
   each adds `.worktrees/shipflow-loop-<issue>` (fix) or
   `.worktrees/shipflow-loop-pr-<n>` (reconcile) (#744). § "Setup — run in a
   worktree (once, before the cycle)".
2. Honour the policy knobs (`renaiss-shipflow config list`) and dispatch
   through the three roles — thin orchestrator, mandatory reviewer, worker —
   as fresh subagents: § "Policies — the three knobs (set once, then trust
   them)" · § "Roles — three subagents the orchestrator dispatches".
3. **Tick 1 only — the Initial Plan (pass ledger)** before ANY dispatch
   (#600); later ticks print only the summary line: § "The cycle — each tick".
4. CLI drift check: § "0. CLI drift check — POST-MERGE (primary) · TICK-START
   (backstop)".
5. **A. Reconcile in-flight first** — `renaiss-shipflow inbox --json`, act per
   `state` until nothing `needsAttention`: § "A. Reconcile in-flight work —
   dispatch a worker per item" and § "Reconcile playbook (inbox `state` →
   action)".
6. **B. Admit new work** under the WIP limit, up to `cap` per pass and up to
   `loop-concurrency` (default 3) issues in flight at once — serial Picks,
   parallel fix workers each in its own worktree (#744) —
   `renaiss-shipflow issue next --json` claims only issues **assigned to the
   loop's account** (`pickup-scope` default `assigned`, #600; assign an issue
   to queue it, `config set pickup-scope all` for repo-wide): § "B. Admit new
   work — under the WIP limit, every issue reviewed first".
7. **C. Bug sweep** when B is empty and A is clean: § "C. Bug sweep — when
   there's nothing left to fix, hunt for new bugs".
8. **D. Repeat** A→B→C to the cap or a truly empty queue; the cap counter
   resets every tick: § "D. Repeat / stop".

## Continuous mode (default) — trigger semantics live HERE

Unless `once` was passed, set the trigger up once, idempotently, at run start:

- Check `CronList`; if no shipflow-loop job exists, `CronCreate` a **recurring** job
  at the interval (default every 15 min — pick an off-`:00`/`:30` minute, e.g.
  `7,22,37,52 * * * *`) whose prompt is the **fully-qualified** command
  **`/shipflow:shipflow-loop`** — **not** the bare `/shipflow-loop`, which a
  scheduler-fired prompt can't resolve (it errors with `Unknown command:
  /shipflow-loop`); always use the exact `<plugin>:<command>` form you were invoked
  as. Then run the first pass now. Re-entry is **idempotent** — a tick sees the
  existing job via `CronList` and skips re-creating it, so crons never stack.
- Each tick is one ordinary pass — it ends with the summary line and **does not
  pause to ask**; an empty queue is fine. Reuse the one loop worktree across
  ticks (don't tear it down between passes).
- **`once`** runs a single pass and stops — no trigger created. **Stop** an
  active continuous loop with `/shipflow:shipflow-loop stop` → `CronDelete` the
  job, then the run-end worktree cleanup (§ "Setup — run in a worktree (once,
  before the cycle)"). Always stop the loop before tearing down the worktree.
- **Caveat:** the trigger fires only while Claude Code is running and the REPL is
  idle, and in some environments (e.g. cmux) it is session-scoped and auto-expires
  after ~7 days. For a true always-on reconciler independent of this session, drive
  `/shipflow:shipflow-loop once` from an external scheduler (system cron / launchd /
  GitHub Actions) instead.

## Every other rule → loop-mode.md

| Topic | loop-mode.md § |
|---|---|
| Policy knobs, `app-slug`, what "approval" is | "Policies — the three knobs (set once, then trust them)" |
| Orchestrator/reviewer/worker contracts, worker model knob | "Roles — three subagents the orchestrator dispatches" |
| Per-`state` actions: `ci_failing`, review feedback, merge-order, `approved_ready`/automerge, "behind base", `conflict` + sweep scope, `reporter_corrected`, `awaiting_reporter`/escalate-once, `needs-human` replies | "A. Reconcile in-flight work — dispatch a worker per item" + "Reconcile playbook (inbox `state` → action)" |
| Intake gate, dependency waits, capability requests, reviewer intake brief, worker fix contract, reviewer PR review + security diff scan + approve flags | "B. Admit new work — under the WIP limit, every issue reviewed first" |
| Sweep procedure, dedupe / exit 12, filing caps | "C. Bug sweep — when there's nothing left to fix, hunt for new bugs" |
| Merge path, intent gate, comment markers, escalation contract, model tiers, WTF brake, health gate, cleanup | "Guardrails" |
| GitHub comment/PR/issue formats, issue-body ladder, commit messages | `references/message-style.md` |

**End of every pass (mandatory):** post the ONE emoji-coded summary line — `✅ N
merged · 🔀 N opened · ⏸ N parked (reason) · 🚧 N escalated (reason)` — rules
(incl. what a `once` run may ask, and gated-row wording) in § "Guardrails" →
"At the cap or an empty queue".
**Tick 1's Initial Plan block (pass ledger) is mandatory** before any dispatch —
shape and sections in § "The cycle — each tick".

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-loop.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
