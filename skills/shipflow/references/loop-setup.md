# Loop setup — worktree + policy knobs + continuous trigger

Split from loop-mode.md §Setup + §Policies (#622) and continuous mode
(#621). The orchestrator loads this card **once per run** (tick 0 /
before the cycle), not every tick.

## Setup — run in a worktree (once, before the cycle)

Always in a git worktree, never the user's live checkout.

**Orchestrator worktree** — ONE, reused across ticks, for serial work only
(`inbox`, `issue next`, automerge, ledger). Prefer `EnterWorktree` with the
fixed name `shipflow-loop`; else
`git worktree add .worktrees/shipflow-loop -b shipflow-loop/base origin/<default>`
(`.worktrees/` gitignored) and `cd` in. Resuming → reuse it. **No worker
checks out, branches, or commits here** — default `loop-concurrency` is 3;
a shared checkout clobbers in-flight siblings.

Merged `fix/issue-*` branches are pruned at merge time by `pr automerge`/
`pr merge`; PRs merged OUTSIDE those commands are healed by the
**merged-branch GC** `inbox` runs each tick (#455) — a local `fix/*` branch
whose PR merged at exactly the local tip gets the same cleanup; unpushed
commits / uncommitted edits are kept and reported (`summary.gcUnpushedKept`).
At run end — once no owned PRs are in flight — `ExitWorktree`, else
`git worktree remove .worktrees/shipflow-loop` + `git branch -D
shipflow-loop/base`; surface path + branch first; keep it if only pausing.

**Workers — one worktree each (#744).** Default (and whenever more than one
worker can be in flight): each dispatched worker creates its OWN worktree
as its first act —
`git worktree add .worktrees/shipflow-loop-<issue> -b fix/issue-<n>-<slug>
origin/<default>` (fix) or
`git worktree add .worktrees/shipflow-loop-pr-<n> <pr-branch>` (reconcile)
— and removes it as its last (`git worktree remove <path>`, after push —
the pushed branch is the artifact; remove on `blocked` too). Never the
shared loop worktree; this is the convention `loop-worker.md` points at.
Scratch artifacts follow the same isolation — per-item paths, never a
shared filename (#683; `loop-worker.md` § Scratch isolation). Run-end
cleanup: `git worktree prune` after the orchestrator-worktree teardown
catches leftovers.

**Solo exception** (`loop-concurrency 1` / `concurrency=1` only): workers
MAY branch and commit in the orchestrator worktree — the old
one-at-a-time flow. Do not take this path under the default.

**Preflight — test baseline (once).** No test framework (no `*.config`, no
`test/`/`spec/`) → dispatch a worker to bootstrap one first: framework for
the stack, 3–5 real tests for the most-changed files, a CI workflow, commit
via `shipflow:smart-commit`. Skip if tests exist or the user opted out. **The
CI-workflow half is not optional when `require-ci` is on** (default): CI that
never runs on PRs deadlocks every PR at merge time (#305) — bootstrap a
PR-triggered workflow, or have the user set `require-ci false` first.

## Policies — the three knobs (set once, then trust them)

Read with `renaiss-shipflow config list`; set with `config set <key> <v>`
(env vars `SHIPFLOW_*` override):

| Knob | Default | Meaning |
|---|---|---|
| `merge-policy` | `manual` | `manual` = never auto-merge (park for a human) · `auto-on-green` = merge when CI green **and** approved · `auto-timeout` = green + no objection past `stale-pr-hours` |
| `require-ci` | `true` | CI must be green before a PR is "advanced" / merged |
| `max-fix-attempts` | `3` | CI-fix tries on one PR before escalating to a human — also caps reporter-correction reworks (#442) |
| `pickup-scope` | `assigned` | `assigned` = the loop claims only issues assigned to its own account — assignment is the queueing gesture (#600) · `all` = repo-wide pickup (pre-#600) |
| `intent-gate` | `strict` | `strict` = a Deviations section, an Interpretation-note callout, or the interpretation marker all park the PR for the reporter · `trusted` = only the EXPLICIT reinterpretation signals (marker/callout) park; reviewer-approved deviations merge on green (#471 — for solo operators) |
| `wip-limit` | `10` | max ACTIONABLE open PRs you own before you stop admitting new work — reporter-parked (`awaiting_reporter`) PRs don't count (#451; read `summary.wipActionable`) |
| `stale-pr-hours` | `48` | a green, unreviewed PR older than this is `stale` → ping/escalate |
| `bug-hunt` | `true` | when the queue is empty, run a test+QA sweep and file issues for bugs found (Phase C) |
| `bug-hunt-cap` | `5` | max NEW issues the bug sweep may file per run |
| `require-review` | `true` | route every issue (intake) and PR (pre-merge) through the reviewer subagent first |
| `cli-drift-poll-seconds` | `180` | how long the post-merge CLI drift check waits for npm to publish before continuing degraded (§0) |

**`loop-concurrency` (default 3, #744)** is invocation-only — a
`concurrency=N` token or `$SHIPFLOW_LOOP_CONCURRENCY`. Not a CLI
preference (`config list` does not show it; there is no persistable
key). `1` = fully serial. Claims, merges, and the drift check stay
serial regardless. Each in-flight worker uses its own worktree +
scratch dir (§ Setup).

Same surface, not a loop policy: **`app-slug`** — the ShipFlow GitHub App
slug trusted to record an intent-gate clearance. Resolution:
`SHIPFLOW_APP_SLUG` → `GITHUB_APP_SLUG` → `config set app-slug` → contract
default. Wrong on a dev/self-hosted App → every reporter-confirmed PR re-arms
`needs-reporter-review` forever (the CLI logs login seen vs slug expected);
fails STUCK, never open — no "any bot" value.

The real merge guard is **GitHub branch protection** — even `auto-on-green`
can't merge what GitHub blocks. Approval = a GitHub review approval **or**
the `shipflow-approved` label, added by the **reviewer** via
`renaiss-shipflow pr approve <n>` — the reviewer's verdict *is* the merge
gate.

## Continuous mode (run start)

Default: one full pass, **dormant ~15 min**, repeat. At run start create
a recurring trigger with `CronCreate` (every 15 min, an off-`:00`/`:30`
minute) whose prompt is the **fully-qualified**
**`/shipflow:shipflow-loop`** — never bare `/shipflow-loop` (`Unknown
command` when scheduler-fired); always the exact `<plugin>:<command>`
form you were invoked as. Run the first pass now; re-entry is idempotent
(`CronList` shows the job — don't re-create); each tick ends without
asking (empty queue is fine). `/shipflow:shipflow-loop once` = single
pass, no trigger; stop with `/shipflow:shipflow-loop stop` (`CronDelete`),
then worktree cleanup (§ Setup). The trigger fires only while Claude Code
runs/idles, may be session-scoped (cmux, ~7-day expiry); for always-on,
an external scheduler (cron / launchd / GitHub Actions) drives
`/shipflow:shipflow-loop once`. Codex CLI and Cursor have no CronCreate —
external scheduler only; subagent dispatch degrades to inline roles
(`references/codex.md`, `references/cursor.md`). Invocation tokens
(`once`, `stop`, `watch=`) live on `/shipflow:shipflow-loop`.
