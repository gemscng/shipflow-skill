# Loop mode — autonomous issue → PR reconciler

Enter this mode **only** when the user explicitly asks to loop through and fix
issues ("loop through the issues and fix them", "auto-fix issues") — that
intent overrides the skill's "Do NOT auto-branch / auto-fix" guardrails.

**Reconciler, not pipeline:** each tick, drive every PR/issue you own one step
toward `merged` first, then admit new work — only under the WIP limit. State
lives in GitHub + ShipFlow: a stopped loop re-reads `inbox --json` and resumes.

**Orchestrator + subagents:** stay thin — read compact JSON, dispatch, collect
one-paragraph returns. Each issue/PR runs in a **fresh-context subagent** (Task
tool); **every issue and every PR passes through the reviewer first**. See
Roles.

## Contents

1. **Setup** — one reusable worktree
2. **Policies** — the knobs
3. **Roles** — orchestrator · reviewer · worker
4. **The cycle** — 0 CLI drift check · A reconcile · B admit · C bug sweep · D repeat/stop
5. **Reconcile playbook** — inbox `state` → action
6. **Guardrails**

Sub-references: `loop-worker.md` · `loop-reviewer.md` · `browser-testing.md` ·
`bug-taxonomy.md` · `qa-report.md` · `pr-feedback.md`.

## Setup — run in a worktree (once, before the cycle)

Always in a git worktree, never the user's live checkout — ONE worktree reused
for every iteration:

- Prefer `EnterWorktree` with the fixed name `shipflow-loop`; else
  `git worktree add .worktrees/shipflow-loop -b shipflow-loop/base origin/<default>`
  (`.worktrees/` gitignored) and `cd` in. Resuming → reuse it.
- All branching/fixing/committing/pushing happens here. Merged `fix/issue-*`
  branches are pruned at merge time by `pr automerge`/`pr merge`; PRs merged
  OUTSIDE those commands are healed by the **merged-branch GC** `inbox` runs
  each tick (#455) — a local `fix/*` branch whose PR merged at exactly the
  local tip gets the same cleanup; unpushed commits / uncommitted edits are
  kept and reported (`summary.gcUnpushedKept`). At run end — once no owned
  PRs are in flight — `ExitWorktree`, else `git worktree remove
  .worktrees/shipflow-loop` + `git branch -D shipflow-loop/base`; surface
  path + branch first; keep it if only pausing.

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

## Roles — three subagents the orchestrator dispatches

Dispatch via the **Task tool**; fresh context each, compact payload back —
the heavy work never enters yours.

- **orchestrator** = you. Read compact JSON (`inbox`, `issue next`,
  `features`, subagent returns), decide, dispatch, count vs `cap`. **Never
  read source files or diffs yourself.**
- **reviewer** — the mandatory gate (`require-review`, default on). Pulls
  `renaiss-shipflow features --json`, reviews an **issue at intake**
  (validate, map to features, acceptance brief) and a **PR before merge**
  (cross-feature impact, regressions, brief met; approves with `pr approve`).
  Contract: `references/loop-reviewer.md`.
- **worker** — fixes ONE issue end-to-end (branch → fix → test → PR →
  evidence), returns `{pr, verified, blocked}`; also runs reconcile fixes.
  Contract: `references/loop-worker.md`.
  - **Worker model knob:** at run start read `renaiss-shipflow config get
    loop-worker-model` (env `SHIPFLOW_LOOP_WORKER_MODEL` overrides). If set,
    pass as Task `model` on every **worker** dispatch — fix and reconcile
    alike; NEVER the reviewer or QA. Best-effort; unset → "Match the model
    to the task" below.

## The cycle — each tick

**Tick 1 only — lay out the Initial Plan before ANY dispatch (#600).** After
the drift probe and first `inbox --json`, read the queue WITHOUT claiming
(`renaiss-shipflow issues list --assignee @me --state open --json` under the
default `pickup-scope assigned`; drop `--assignee` when scope is `all` —
show the queue the loop will ACTUALLY pick from; a read, never `issue next`)
and print one plan block:

| Section | Content |
|---|---|
| Policies | merge-policy · require-ci · cap · wip-limit · pickup-scope · intent-gate, one line |
| Reconcile | one row per in-flight PR: `#N · state · planned action` |
| Admission queue | the scope's eligible issues in pickup order (priority → severity → newest), up to `cap`, each `#N · priority · title` |
| Deferred | anything visible but not actionable this run (parked, waiting-on, over-cap) with the reason |

The operator's chance to interrupt a wrong plan before workers spend tokens;
later ticks print only the one-line summary — never repeat the plan block.

### 0. CLI drift check — POST-MERGE (primary) · TICK-START (backstop)

Every verdict comes from whatever `renaiss-shipflow` PATH resolves, and
**drift is directional**: an older CLI knows fewer blockers and biases toward
merging what should hold — a stale binary called a `CONFLICTING` PR
`approved_ready`, `readyToMerge: 1` (measured, #435). **Run both triggers:**

| Trigger | Catches | Misses on its own |
|---|---|---|
| **post-merge** (primary) | the version your own merge just published | drift a fresh session inherited |
| **tick-start** (backstop) | drift from before this session | a whole tick on the binary the merge obsoleted |

**Procedure** — `renaiss-shipflow version --json` → read `drift`
(`current`/`stale`/`ahead`/`unknown`), `registry.latest`, `channel`,
`remediation`. (`version --check` = same probe as exit code: **9** = stale,
0 = anything else; a binary predating the gate rejects the flag — the
`legacy-stale` case, not a pass.)

1. **Tick start** — probe **once**, no poll. Read the answer's SHAPE first:

   | Probe answer | Means | Do |
   |---|---|---|
   | `drift` key present, not `stale` | gate ran, binary is fine | continue immediately |
   | `drift` key present, `stale` | gate ran, binary is behind | step 3 |
   | **no `drift` key** in `version --json` | gate **could not run** | **legacy-stale** → 1a |
   | **`version --check` exits 1** / `unknown option` | gate **could not run** | **legacy-stale** → 1a |

   **A missing gate is not a passing gate** — on release day the PATH binary
   is the previous release (measured on 0.28.2). Exit **1** is never a gate
   verdict; the gate exits only **9** or **0**.

1a. **Legacy-stale bootstrap** — read both sides yourself, remediate before
   anything else this tick:

   ```bash
   INSTALLED=$(renaiss-shipflow --version 2>/dev/null | tr -d '[:space:]')
   LATEST=$(curl -fsSL --max-time 8 -H 'cache-control: no-cache' \
     "https://registry.npmjs.org/-/package/@renaiss-shipflow%2Fcli/dist-tags?_cb=$(date +%s)" \
     | sed 's/.*"latest"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
   REAL=$(readlink -f "$(command -v renaiss-shipflow)" 2>/dev/null \
          || python3 -c 'import os,sys;print(os.path.realpath(sys.argv[1]))' "$(command -v renaiss-shipflow)")
   PLUGIN_DIR=$(ls -d ~/.claude/plugins/cache/renaissshipflow/shipflow/*/ 2>/dev/null | sort -V | tail -1)
   echo "installed=$INSTALLED latest=$LATEST realpath=$REAL plugin_dir=$PLUGIN_DIR"
   ```

   `$LATEST` empty (offline) → warn once, **continue degraded** — never
   halt. `$INSTALLED` older than `$LATEST` (`sort -V`, not string equality)
   → remediate via the step-3 table using `$REAL`, then re-read `--version`
   (step 4). After a verified upgrade the normal path applies.
2. **After each merge that could publish a CLI** — **poll** until
   `drift: "stale"` or the window closes. **Scope first: did the merge touch
   `apps/renaissshipflow-cli/**`?**

   ```bash
   gh pr view <n> --json files --jq '[.files[].path | select(startswith("apps/renaissshipflow-cli/"))] | length'
   ```

   `0` → **skip the poll** (a no-CLI merge can't stale your binary; the
   window costs ~3 min per merge; tick-start backstops it). Non-zero → poll
   every ~15s up to `remediation.pollWindowSeconds` (`config get
   cli-drift-poll-seconds`, default 180, env
   `SHIPFLOW_CLI_DRIFT_POLL_SECONDS`) — publishing lags a merge ~62s
   (measured, #441). Window closes clean → continue; next tick-start catches
   it.
3. **On `stale` — run `remediation.command` verbatim.** It **branches on
   `channel`**:

   | `channel` | realpath contains | command |
   |---|---|---|
   | `plugin-launcher` | `/.claude/plugins/cache/` | `claude plugin update shipflow@renaissshipflow` |
   | `launcher-cache` | `/.shipflow/cli/` | `"$PLUGIN_DIR/bin/shipflow-cli-update" --force` |
   | `npm-global` | `/node_modules/@renaiss-shipflow/cli/` | `npm i -g @renaiss-shipflow/cli@<registry.latest>` — an **exact** version |
   | `unknown` | anything else | none — banner, then continue (a dev checkout; a human decides) |

   **Match rows top-down — the order is the fix.** `launcher-cache` (#307)
   **contains the `npm-global` substring** — matching `npm-global` first
   sends `npm i -g` into a prefix the launcher never scans (exit 0, still
   stale). `version --json` already applies this order; hand-match only on
   the legacy path (1a). **Never a bare `@latest`** — `npm install` serves
   dist-tags from cache up to 300s; an exact-version spec refetches.
4. **Verify by the version STRING, never the exit code** — re-read
   `renaiss-shipflow --version` and compare (measured: exit 0 with the
   version unchanged). Same string = no upgrade.
5. **Continue either way — NEVER halt the tick.** Unverified → one loud
   banner (`⛔ CLI DRIFT: installed 0.27.10 · registry 0.28.2 · channel
   npm-global — verdicts may under-report blockers`) and **CONTINUE
   DEGRADED** — a refuse-on-gap gate would deadlock the loop after every
   merge it performs. Auto-upgrade → verify → warn; never refuse.

`drift: "unknown"` (offline, registry blip) is **not** stale: warn once,
continue.

**Provenance:** `inbox`, `pr packet` and `pr reviews` stamp `cli: {version,
channel}` into their `--json` envelope — every verdict traceable to its
binary.

### A. Reconcile in-flight work — dispatch a worker per item

Tick-start drift probe (§0, one call), then `renaiss-shipflow inbox --json`
(compact — all *you* read). Per PR whose `state` needs action, dispatch a
worker scoped to that PR; loop A until nothing in-flight `needsAttention`:

- `ci_failing` → worker fixes failing checks (`gh pr checks <n>`), pushes.
  Track attempts across ticks; `max-fix-attempts` still red →
  `renaiss-shipflow issue escalate <issue> --reason "CI red after N attempts: …"`.
- `changes_requested` / `review_comments` → worker addresses every comment,
  **including async external bot reviewers** (gemini-code-assist,
  coderabbit): `renaiss-shipflow pr reviews <n> --json` to list, fix, push,
  reply, **resolve the thread** (`pr resolve <n> --thread <id>`),
  re-dispatch the reviewer. Ambiguous/conflicting → escalate.
- **Merge-order (#603/#608):** multiple own PRs approved+green → ONE
  `renaiss-shipflow pr automerge --all-ready --json` (evaluates oldest-first
  internally; each merge would invalidate later candidates' freshness).
  Dispatch syncs only for rows it reports behind-base.
- `approved_ready` → reviewer already added `shipflow-approved` (B step 4)
  → `renaiss-shipflow pr automerge <n> --json` (merges only if
  `merge-policy` + CI + approval allow **and no review thread is
  unresolved** — hard gate; parks on `manual`). **A merge that lands →
  POST-MERGE drift check (§0) before the next dispatch.**
  **`"unsatisfiable": true` = ESCALATE, do not re-poll** (#305): the
  blocker can never clear by waiting (e.g. `require-ci` on, repo has NO
  CI). `issue escalate <issue> --category external-dependency --reason
  "PR #<n> automerge unsatisfiable: <blocker> can never clear by waiting."`
  ONCE, recommending both remedies (PR-triggered workflow · `config set
  require-ci false`), then move on. `--reason` is mandatory — empty fails
  lint, exits 1 *before* `needs-human` lands, reopening the re-poll.
- `conflict` → worker resolves agentically: `renaiss-shipflow pr sync <n>
  --keep-conflicts` (exit 6 = rebase mid-flight + conflicted files), then
  `references/conflict-resolution.md` — resolve by intent, stage only
  resolved paths, `pr conflict-check --base origin/<base>` (exit 8) before
  each `rebase --continue`, TEST before push, force-with-lease, comment the
  resolution on the PR; reviewer gate re-runs. Escalate only per that doc's
  criteria. Scope = OWN PRs unless `config set conflict-sweep true`
  (default off), and even then only trusted heads (same-repo,
  `OWNER`/`MEMBER`/`COLLABORATOR`, no drafts); `humanOnly: true` rows are
  never checked out.
- `reporter_corrected` → **rework — the reporter has answered** (#442).
  Gate stays ON: nothing merges, the reworked PR re-arms. Full protocol +
  row schema → Guardrails § "A reporter correction IS the human answering".
  **Judge first** — a question or chatter is not a correction.
- `awaiting_reporter` → **park; the reporter must confirm** —
  `needs-reporter-review` = unconfirmed interpretation (#190), no policy
  merges it, silence parks forever by design. Exception `escalateOnce: true`
  (`rework_ceiling`, `correction_unreadable`, or `reporter_gate_stale` #439
  — gate stood past `stale-pr-hours`; `gateAgeHours` = how long): sole
  action `issue escalate <parent> --for-pr <pr> --once-reason
  <escalateOnceReason>`, then the row parks forever on that (PR, reason).
  **Never a PR comment** — one shared login; an unmarked nudge reads as the
  reporter answering (#477). **Outranks `conflict`** and everything else:
  lower routes act on the PR, and acting can destroy the gate (self-clearing
  label #411; the conflict route requires commenting). `reasons` still
  carries both `needs-reporter-review` and `merge_conflict`; only the
  dispatch is withheld (reverses #393 here).
- `stale` / `ci_pending` / `awaiting_review` → per the playbook table
  (don't busy-wait).

🔴 **`escalateOnceUnknown: true` = inbox INCOMPLETE — never stop on it.**
The CLI couldn't read the parent's `escalate-once` markers; the row parks
(duplicate escalation is the expensive direction) on a gate that did not
run, so `prsNeedingAttention` may undercount (`summary.degradedInputs`
carries `escalate-once-markers`; `summary.escalateOnceUnknown` counts
rows). In a **`once`** pass, re-read the inbox before concluding or the
owed escalation is never filed (#482).

A PR becomes `approved_ready` **only** via reviewer approval — never
hand-add `shipflow-approved`. Per in-progress issue with a `newComment`, a
worker reads + acts. **A human reply on a `needs-human` issue unblocks it**
— only a *decision*, from a person (never the loop's own `🚧 **Needs a
human**` / evidence comments):

- **Trigger** — a green-light reply ("proceed / go ahead / just work on it
  / do it") or a structured per-decision reply; question/chatter-only stays
  escalated.
- **Structured answers** — lines `N: answer` (`1: frankfurter`, `3: me`) or
  the one-line comma form. Parse with `parseDecisionReplies`
  (`apps/renaissshipflow-cli/src/escalation-format.ts`); mark answered items
  resolved by editing the live 🚧 comment in place with the **existing**
  `renaiss-shipflow issue escalate <n> --update` (PR #59 — no new CLI/server
  surface). **Clear `needs-human` only when ALL are answered** — a partial
  reply stays escalated and keeps its claim. Bake answers into the brief as
  **settled**.
- **Act** — remove `needs-human`; **add the durable marker label
  `loop-proceed`** (the persistent record a fresh-context reviewer reads on
  a later re-pick). Reviewer's prior `reject` = **overruled**. Brief the
  guidance as settled, hand to a worker (B step 3) — smallest sensible
  slice if big; the reviewer gates the PR.
- **Sticky** across re-picks/restarts: don't re-run intake validity,
  **never re-escalate the answered question**; `loop-proceed` makes
  reviewer intake (Mode 1) skip the validity-reject, straight to the brief.

### B. Admit new work — under the WIP limit, every issue reviewed first

WIP counts **actionable** open PRs only — `summary.wipActionable` from
`inbox --json` (#451): reporter-parked (`awaiting_reporter`) PRs are a
timer like `issue wait --on #X` and would jam admission (a PR whose PARENT
issue is `needs-human`-escalated still counts; PR #470). `wipActionable` ≥
`wip-limit` → skip B (drain A). Else, while PRs-opened-THIS-PASS < `cap`,
admit ONE issue — each step a fresh subagent. **Cap is per pass, not per
session** (#451): continuous mode RESETS the counter each tick; "🛑 at cap"
only in a tick that itself opened `cap` PRs.

1. **Pick** — `renaiss-shipflow issue next --json` (claims the next
   open/unclaimed issue **assigned to the account running the loop** —
   `pickup-scope` defaults to `assigned` (#600): assigning IS the queueing
   gesture; unassigned issues are invisible. `config set pickup-scope all`
   = repo-wide pickup. Ordering: priority → severity → newest; optional
   `--label bug`; skips `needs-human`/claimed).
   - **Intake gate (#448):** author association not
     `OWNER`/`MEMBER`/`COLLABORATOR` (or unreadable — fails closed) →
     labelled `needs-reporter-approval`, **not claimable** until someone
     with **triage or above** removes the label (GitHub-enforced). Non-code
     contributors confirm in chat, where ShipFlow knows their identity.
     Unset = `code-org`.
     - **Arming happens ONCE** — hidden `shipflow:intake-gated` marker in
       the gate comment; removal sticks (never re-applied) and IS the
       approval. **Only a LOOP-AUTHORED marker counts**
       (`viewerDidAuthor === false` → ignored); label removal stays the
       only approval.
     - **Approval = the removal EVENT, not label absence:** read the
       `unlabeled` timeline live; require a **named actor** (NULL
       rejected), else withhold, write nothing (stale-snapshot race,
       PR #450 round 5).
     - **Approval binds to the CONTENT:** body OR title edited **after**
       removal → re-arm (pre-approval edits untouched). `lastEditedAt` =
       body only; a retitle is a `RenamedTitleEvent`, and on a thin-bodied
       issue the title IS the spec (PR #450 round 6).
     - **Trust set wider than approval permission:** `COLLABORATOR`
       includes read-only invitees → their own issues admitted ungated.
       Deliberate (mirrors `pr-state.ts` / `trustedAuthorAssociations`);
       control: don't invite read-only outside collaborators on a
       loop-built repo.
     - `config set intake-approval off` = gate fully off — stops arming AND
       frees already-labelled issues (nothing removes
       `needs-reporter-approval` automatically, #473 — `off` is the only
       repo-wide recovery). `intake-approval reporter` accepted but not
       honored on GitHub intake (#473) — gates like `code-org`.
     - Unreadable author association / comment list → gate that pass only,
       write **no** label.
   **Exit 4** / `issue: null` → nothing to admit.
   - **Dependency check:** blocked-by/depends-on an unmerged `#X` →
     `renaiss-shipflow issue wait <n> --on <#X> --reason "…"`, pick the
     next. NOT `escalate` — a dependency is a timer: `wait` labels
     `⏳ waiting-on`; `issue next` re-admits once `#X` merges/closes
     (cross-repo `owner/repo#N` works). Reserve `escalate`/`needs-human`
     for questions only a person can answer.
   - **Missing capability/secret/access:** when escalating for something
     the loop can't grant itself, ALSO file `renaiss-shipflow capability
     request --class <capability|access|secret|policy> --title "…" --why
     "…" --issue <n>` — the operator's standing queue
     (`docs/PRIORITIES.md` governance).
2. **Reviewer — intake** (mandatory; `require-review`). Dispatch with issue
   + triage. It pulls `features --json`, consults `renaiss-shipflow
   priorities --json` → `docs/PRIORITIES.md` (greenlit class + normal slice
   proceeds; deploy-blast-radius always per-item sign-off; off-doc
   escalates — `loop-reviewer.md` Mode 1 step 1b), validates, maps to
   features, returns an **acceptance brief** (what "done" means + features
   to regression-check). Reject (invalid/duplicate/needs a human) →
   `issue escalate`, pick next. **Partial-slice brief → file each deferred
   part as a follow-up sub-issue now** — `renaiss-shipflow issue create
   --title "…" --body "Part of #<n>: …" --json` — *before* dispatching the
   worker; bodies per the **issue-body ladder** (§ "Message style"), status
   header sourcing `Part of #<n>`.
   **Handle exit 12 on every filing** — a bare non-zero exit read as
   "failed command" silently drops the deferred scope: on **12** read
   `{blocked: true, candidates: […]}`, link the existing issue or re-file
   with **`--allow-duplicate`**; never read 12 as "filed" or "broken".
   **Post the brief's "Unknowns & assumptions" on the issue**, comment
   ending `<!-- shipflow:loop -->` (never trips the needs-human
   auto-unblock), before dispatching — a reply IS the veto (Phase A treats
   it as the decision).
3. **Worker — fix.** Dispatch with issue + triage + brief. It pulls the
   feature map itself (`features --json`); in the loop worktree: branch
   `fix/issue-<n>-<slug>` off `origin/<default>`, fix, run project tests
   **and** a diff-scoped E2E browser pass with before/after screenshots +
   **health score** (`references/browser-testing.md`), **add a regression
   test**, open the PR via `renaiss-shipflow pr create --json` (full fix →
   `Closes #N`; partial slice → `Part of #N`, never a closing keyword —
   `loop-worker.md` §5), attach evidence with the health delta
   (`issue evidence <n> --pr <pr> --file …`). Returns `{pr, verified,
   regressionTest, healthDelta, blocked}`. Unverified/blocked →
   `issue escalate`, no PR.
4. **Reviewer — PR review** (mandatory). Dispatch on the new PR with the
   brief. First the MANDATORY **security diff scan** — **the reviewer is
   the scanner** (loop-reviewer.md §0b), not the `security-review` skill
   (it can't scan a captured file; a CLEAN verdict with an empty `DIFF
   CONTENT` is evidence of nothing; /claude-security stays human-run).
   Four steps, in order:

   | # | Step | Command / artifact |
   |---|---|---|
   | 1 | **Capture** server-side — never from the cwd | `renaiss-shipflow pr diff <n> --out /tmp/pr-<n>.patch` → prints `files=N lines=N sha256=<hex>`; **exit 9 is a blocker → `request_changes`**, never a retry |
   | 2 | **Read** the capture — the hunks, not a summary | Read `/tmp/pr-<n>.patch` (secrets, authz, input handling, exec/network, file posture, agent instruction text) |
   | 3 | **Write** the findings | `/tmp/pr-<n>.scan.md` — findings or none; "none" is a result and has to be recorded somewhere falsifiable |
   | 4 | **Attest** — all three flags, or approval is refused | `--scan-files <N>` `--scan-report <path>` `--scan-digest <hex>` |

   Findings are fix-or-refuted like bot threads; a skipped scan is stated
   loudly and parks code diffs (docs-only may proceed). Then check external
   reviews (`renaiss-shipflow pr reviews <n> --json`), pull `features
   --json` + the diff for a **whole-system review**, post the review,
   verdict:
   - **approve** — only with **no unresolved review threads**, brief met,
     CI green. All three scan flags required on a code diff — **exit 9**
     without them — sourced from the same `pr diff` capture actually read:
     ```bash
     renaiss-shipflow pr approve <pr> --comment "<summary>" \
       --scan-files <N from files=> \
       --scan-report /tmp/pr-<pr>.scan.md \
       --scan-digest <hex from sha256=>
     ```
     (adds `shipflow-approved`; refuses, exit 7, if any thread is open).
     Now `approved_ready` for A.
   - **request changes** → list every fix incl. each external thread;
     re-dispatch a worker to fix + `pr resolve`, then re-review. Never
     approve with open threads. External reviewers are async — none posted
     yet → leave parked; A's next tick catches the late review.

No `issue done` here — the claim stays until the PR merges (A's automerge
releases it), keeping the issue out of `issue next` meanwhile.

### C. Bug sweep — when there's nothing left to fix, hunt for new bugs

B exits 4 / `issue: null` **and** A is clean → if `bug-hunt` is on
(`config get bug-hunt`, default **true**), turn idle time into QA that
refills the queue:

1. **Sweep methodically** (dispatch a QA subagent) — run `renaiss-shipflow
   test` and **`renaiss-shipflow regression --wait --json`** (ShipFlow's
   own **E2E test_runner**; blocks until the generated API/UI cases finish
   in the configured test environment). Gate on the executed result —
   `--wait` exits non-zero, `result.status: failure` when real E2E cases
   fail; each failed case = a **reproduced bug** for step 2 (repro = name +
   api/ui hint). `success`/`skipped` (or "no test environment configured" →
   manual checklist only) → no E2E bugs. Then a real-browser QA sweep:
   `renaiss-shipflow features --json` to prioritise `high` `test_priority`
   features, per-page checklist on each (`references/bug-taxonomy.md` §4:
   click everything, fill forms, empty/error states, console after each
   interaction, responsive, auth boundaries). Compute the **health score**,
   diff against the stored baseline (`references/qa-report.md`) — a drop =
   regression. Screenshot anything broken.
2. **File genuine bugs as issues** — each **actually reproduced** (retry
   once), severity + category from the taxonomy, not already open (dedupe
   is enforced by `issue create` itself — below; skip `auto-qa` items you
   already filed):
   `renaiss-shipflow issue create --title "<bug>" --body "<issue-body ladder>"
   --label bug --label auto-qa --label "severity:<…>" --label "area:<…>" --json`
   (`bug-taxonomy.md` §3; body = the **issue-body ladder**, § "Message
   style" — status header sourcing `auto-qa sweep`). Attach evidence
   (`issue evidence <n> --file <shot>`), update the baseline. **Only file
   what you reproduced.**

   **Near-verbatim duplicate filing is blocked in code (#580) — but the
   check is narrow, so keep searching.** `issue create` scans every open
   issue (`--limit 1000`) and refuses only a near-verbatim restatement. A
   **paraphrase slips through** (#404 vs #569, ~0.38) — still
   keyword-search before filing, and never rely on `renaiss-shipflow
   issues list --json` alone: its default `--limit 30` newest-first slice
   cannot contain an older duplicate (how #579 restated #427). Pass
   `--limit 1000` for this.

   **The rule cuts both ways.** A strict-superset title is refused 100% of
   the time — a narrower issue quoting an open title and extending it
   **will be refused, by design**. A digit- or negation-bearing extension
   (`… exceeds 64 KB`) files clean (such tokens are must-match-exactly).
   Two ways through:

   | Your filing vs the open issue | Do this |
   |---|---|
   | Genuinely the same defect, stated more precisely | Comment the extra detail on the open issue — don't file |
   | A distinct defect that merely shares the wording | Re-file with **`--allow-duplicate`**, and say why in the body |
   | Different numbers or a negation (`exits 5`→`7`, `is`→`isn't`) | Files cleanly — the discriminator gate sees the difference |

   **Citing an issue (#587):** an issue reference is digits, and citing
   the issue you were restating used to skip the check. No longer;
   per-candidate:

   | Title filed while #427 is open | vs #427 | vs every OTHER open issue |
   |---|---|---|
   | #579's title + ` (#427 regression)` | **refused** at 0.778 — `427` is dropped from gate 3, but the citation tokens stay in Dice, so 0.875 deflates to 0.778 | `427` still discriminates in full |
   | #579's title + ` (#999 regression)` | files clean — `999` still discriminates | `999` still discriminates |
   | `owner/repo#427` anywhere in the title | files clean — a cross-repo ref is not a citation | unchanged |
   | `427` used bare *and* cited (`retried 427 times, see #427`) | files clean — one bare use is enough | unchanged |

   **A citation of the issue you are restating no longer excuses you; a
   citation of any OTHER issue still does** (measured, #587; dropping every
   cited number is deliberately NOT the rule — #590). **The margin is
   thin**: 0.778 sits 0.078 above the 0.70 floor — three more content words
   tip a refusal into a clean file (#588).

   | Outcome | Exit | What you do |
   |---|---|---|
   | No match | 0 | Filed — carry on (a clean exit is **not** proof there's no duplicate; see above) |
   | Match, `--json` / `--yaml` | **12** | Read `{blocked: true, candidates: […]}` and **comment on the existing issue** instead — nothing was created |
   | Match, genuinely a different bug | **12** | Re-run with **`--allow-duplicate`** (it echoes what it overrode) |
   | Scan window came back FULL | 0 | Filed, with a loud `window is FULL` warning — the older issues were never scanned; check by hand |
   | Open-issue fetch failed | 0 | Warned + filed anyway — a GitHub outage never blocks a filing; dedupe by hand |
3. **Feed the loop**: filed ≥1 new issue → **back to A**. Nothing new
   (clean, or only dupes) → *that's* the real stop.

Bound it: at most `bug-hunt-cap` new issues per run (default 5); the PR
`cap` still applies to fixes. `config set bug-hunt false` (or
`SHIPFLOW_BUG_HUNT=false`) → an empty queue just stops.

### D. Repeat / stop

Loop A→B→C. The PASS ends at `cap` PRs-opened-this-pass, **or** empty queue
AND an empty sweep (or `bug-hunt` off). Continuous mode: next tick = FRESH
pass, cap counter at zero — the cap never carries across ticks (#451).
Report an empty queue as "queue empty", never "at cap". `cap` precedence: a
user `cap=N` token (`cap=all` drains the queue), else `SHIPFLOW_LOOP_CAP`,
else **5**.

## Reconcile playbook (inbox `state` → action)

Ladder, highest first: `reporter_corrected` › `awaiting_reporter` ›
`conflict` › `ci_failing` › `changes_requested` › `review_comments` ›
`ci_pending` › `approved_ready` › `stale` › `awaiting_review`.

`awaiting_reporter` outranks everything below it — `conflict` included —
because every route below has a worker *act on the PR*, and an unconfirmed
interpretation must not be reworked, rebased or merged until the human
answers (#411). `reporter_corrected` sits one rung above (#442): **a
correction IS the human answering**, so the *rework* is admitted — nothing
else loosens (label stays, `pr automerge` still refuses `unconfirmed
interpretation`, rebase/merge withheld, the reworked PR re-arms; silence
still parks forever).

| `state` | What it means | Action |
|---|---|---|
| `reporter_corrected` | still gated, and the reporter replied with a correction | rework per § "A reporter correction IS the human answering" — brief it as settled; the gate stays ON |
| `awaiting_reporter` | approved + green, interpretation unconfirmed (`needs-reporter-review`) | park — the reporter must confirm; re-checked next tick. **Unless the row says `escalateOnce: true`** (`rework_ceiling` / `correction_unreadable` / `reporter_gate_stale`) → `issue escalate <parent> --for-pr <pr> --once-reason <escalateOnceReason>` ONCE, nothing else — **never a PR comment** |
| `ci_failing` | a check is red | fix on branch, push; escalate after `max-fix-attempts` |
| `changes_requested` | reviewer wants changes | pr-feedback → fix → push → reply |
| `review_comments` | unaddressed comments | pr-feedback (may already be handled) → reply |
| `ci_pending` | checks running | park — re-check next tick |
| (automerge blocker "behind base", **and it is the only blocker**) | green+approved but the head predates the current base — CI proved code against a base that no longer exists | worker: checkout, `pr sync <n> --no-push` (rebase), run the tests, THEN `git push --force-with-lease` — `pr sync` pushes by default, and a clean textual rebase can still fail the build, so never let it push an unverified head. Merge lands next tick on the rebased head (#530). Any other blocker present (`manual` policy, red CI, open threads, unconfirmed intent) → handle/park that first; rebasing a PR the policy can't merge is churn every base advance repeats. Rebase conflicts → the `conflict` protocol. `unsatisfiable: true` → escalate once |
| `approved_ready` | approved + CI green | `pr automerge` (parks on `manual`) |
| `stale` | green, unreviewed, old | nudge the PR; escalate if blocked on a human |
| `awaiting_review` | green, no feedback yet | park |

## Guardrails

- **The reviewer gate is mandatory** (`require-review`): no worker starts
  an issue without an intake brief, no PR merges without the reviewer's
  review + `pr approve`; the reviewer always pulls `features --json` first
  — whole system, not just the diff.
- **Orchestrator context discipline:** dispatch, don't do — compact JSON
  and one-line subagent returns only, never source files, diffs, or test
  logs (that's what lets `cap=all` run without bloat).
- **Reap finished subagents:** once you've read a return, release the
  agent — `TaskStop` its task, or a `shutdown_request` for a named
  teammate. Cleanup is part of finishing the tick.
- **Match the model to the task.** Mechanical work (clear-error CI fix,
  lockfile rebases, thread replies, doc edits) → fast/cheap tier;
  implementation with a structured brief → standard tier; **the reviewer
  and anything ambiguous or security-adjacent → strong tier, always** —
  never downgrade the reviewer (measured, Superpowers 6). Unsure →
  standard. Pin the worker tier via `renaiss-shipflow config set
  loop-worker-model <model>` (env `SHIPFLOW_LOOP_WORKER_MODEL` wins) —
  Task `model` on **worker** dispatches only; never the reviewer.
- **Narrate in one line** per dispatch — `tick 3: #42 worker → PR #97
  opened` — never a paragraph (measured ~50% output saved, zero loss).
- **Optional persistence:** the user may pair the loop with `/goal "drain
  the queue and merge everything mergeable"`. `/goal` is
  **orchestrator-only** — never a stop-hook/goal inside a subagent;
  subagents must *return* (self-verify contract) for the loop to progress.
- **`pr automerge` is the only merge path the loop uses** — it self-gates
  on `merge-policy`; default `manual` never merges. **Never** bare
  `pr merge` or `release` without explicit human confirmation. In a
  **spawned / headless session** (OpenClaw, Hermes, cron — SKILL.md
  "Spawned / headless sessions") no human can confirm: `pr automerge` +
  `merge-policy` is the whole merge story; `release` is skipped (escalate
  if genuinely needed).
- **Escalate, don't spin — but split before you escalate.** Escalation is
  a **last resort**. A merely large/open-ended/ambiguous item → **carve a
  bounded, value-adding slice**, defer the rest as follow-up sub-issues
  (the **orchestrator** files them, `Part of #N`, at admit time — Phase B
  step 2, where **exit 12 is expected, not a failure**; never let a
  non-zero exit drop the deferred scope).
  Reserve `issue escalate` for a genuine **hard blocker**: missing
  secrets/credentials or external setup, a security-/trust-critical
  surface unverifiable autonomously, an absent spec/design doc, a hard
  dependency on an unmerged issue, or a duplicate/invalid issue.
  `issue escalate` may return `autoResolved: true` (precedent auto-apply,
  server flag-gated): a stored human answer to the SAME question was
  reused — disclosure comment on the issue, no `needs-human`, claim KEPT.
  Treat it exactly like a human reply: implement and continue; never
  re-escalate. A human `undo` reverses it (server then applies
  `needs-reporter-review`).
  A single blocked item → `issue escalate` (labels `needs-human`, keeps
  the claim, comments why) and move on — it never ends the run; never
  pause mid-run to ask for direction.
  Write `--reason` action-first — `### 👤 Action needed` (numbered steps,
  ending "remove the `needs-human` label") → `### Why it's blocked` →
  optional `### Ready once unblocked` — plus `--category`, and `--owner`
  when the issue names one (else the CLI resolves `signoff-owner` config →
  issue author). Only Action needed renders unfolded (the CLI collapses
  the rest into `<details>` and rejects action lines over 30 words); never
  an open question without a `**Recommendation:**` line — the CLI lints
  and rejects; full contract in `loop-reviewer.md` Mode 1.
- **The priorities doc is human-edited only.** `docs/PRIORITIES.md`
  (`renaiss-shipflow priorities`) is the owner's policy (#211): read it,
  **never edit it**; propose changes via `issue escalate`. Greenlit never
  overrides safety: deploy-blast-radius work (revert/release/config paths)
  always needs per-item sign-off.
- **Escalations shrink as slices land.** A merged slice settling a
  decision → `issue escalate <parent> --update …` with the remaining ask
  only (settled items "resolved by #N"); check off the parent body's
  decision checklist. One live 🚧 comment per issue — `--update` edits in
  place, never stacks banners.
- **Mark loop comments on escalated issues.** The server auto-clears
  `needs-human` on a *human* reply — it recognizes machinery by the 🚧
  banner and **any** `<!-- shipflow:` marker, not by author (the loop
  comments under the operator's account). Any non-resolving loop comment
  on a `needs-human` issue MUST end with `<!-- shipflow:loop -->`, or it
  un-parks the issue. `issue escalate` output needs no marker (🚧 banner
  exempts it). Markers match by **prefix**, not a list (#411):
  `<!-- shipflow:loop-review -->`, `<!-- shipflow:precedent-applied …` and
  any future marker are machinery too.
- 🔴 **`needs-reporter-review` is the opposite polarity — it does NOT
  clear on any reply.** The #190 intent gate: a merge blocker until a
  human confirms a worker's reading. The server clears it **only** on an
  explicit affirmative and **ignores unknown prose** (#411 — a plain loop
  comment used to strip it; PR #405 merged with the gate machine-cleared).
  Rules:

  | On a `needs-reporter-review` PR | Rule |
  | --- | --- |
  | **Any comment the loop posts** | MUST carry a `<!-- shipflow:` marker — `pr approve --comment` and `pr post-review` stamp `<!-- shipflow:loop-review -->` for you; a hand-written `gh pr comment` does not |
  A reporter who wants the PR merged replies `confirmed` (or another token) as
  the whole reply; anything more is a correction.

  | **Releasing the gate** | only the reporter, with a reply that is ONLY `confirmed` / `confirm` / `/confirm` / `approved` / `yes` / `lgtm` / `sgtm` / `ship it` / `+1` / 👍 and nothing else — never the loop |
  | **Releasing it the other way** — the numbered `N: answer` door | a decision reply to an escalation ALSO releases it, under **four** preconditions, every one required: the block is the whole quote-stripped reply; **every** line of that block is itself a decision line; **every** answer is a `confirmationTokens` entry; and the thread carries an escalation banner. That fourth one is weaker than it sounds — `escalationOutstanding` returns true on the **first banner found anywhere in the comment history**, with no answered/resolved/superseded check, so a **stale** banner still opens this door (#486). The rule is single-sourced in `contracts/shipflow-contract.json` → `intentGate.$comment` — read it there; do **not** restate the matcher here (two hand-written copies is how #411 happened) |
  | **Correcting the reading** | leaves the gate ON, by design: rework the PR — the loop now DOES, via `reporter_corrected` (see below) |
  | **A QUALIFIED yes** | also leaves it ON — `yes but change the copy first` is a correction, not consent |
  | **Prose that reads as consent** | also leaves it ON — even `Confirmed — ship it`, because it is not the token |
  | **A token with ANYTHING under it** | also leaves it ON — one newline or one blank line, a correction or a thank-you |
  | **Human override** | remove the label in the GitHub UI |

  An **exact token that is the whole reply**, not a grammar: markdown
  decoration and trailing punctuation are stripped (`**Confirmed**`,
  `- lgtm`, `Confirmed.` all work); a token in a sentence, or with
  anything after it, never releases — the matcher refuses without
  inspecting what follows. A miss gets **one** nudge naming every token,
  pointing commentary to a separate comment.

  Whether a deployment *runs* these doors is a version question (both
  shipped in server **0.28.2**, `a3b3d9c`, PR #441) — never state it from
  this doc; read it:

  | Check | Command |
  | --- | --- |
  | Deployed server build (plus CLI/plugin drift) | `renaiss-shipflow version` |
  | The server directly | `GET /api/v1/version` on the API host |

  **`renderIntentGateNotice` (CLI) and `renderIntentGateNudge` (server)
  deliberately say NOTHING about the numbered door — leave it that way**;
  adding it to either surface is a regression.

  The loop **never** clears this gate on the reporter's behalf. Every
  server removal posts an attributable audit comment naming the actor and
  quoting their line — a vanished label with no such comment is a bug,
  not a confirmation.
- 🟢 **A reporter correction IS the human answering — rework it** (#442).
  `inbox` classifies such a PR **`reporter_corrected`** — ranked above
  `awaiting_reporter`, `needsAttention: true`, `reasons:
  ["needs-reporter-review", "reporter_correction"]` — with the reply ON
  the row: `corrections: [{id, author, at, url, excerpt}, …]` (every
  unanswered comment, OLDEST first), `correction` = `corrections[0]`,
  `parentNeedsHuman`; summary gains `reporterCorrected`. The CLI decides
  only the deterministic half — *which comments has the loop not already
  answered?* You decide the rest:

  | Check | Rule |
  | --- | --- |
  | **Decision, or question?** | Only a DECISION dispatches — "not quite, scope it to the CLI only". A question or chatter ("does this cover the migration?") stays parked, exactly as it does on a `needs-human` issue. Guessing here burns a worker cycle per stray comment. |
  | **Read the WHOLE list** | The decision is often NOT the newest comment: the gate's nudge tells reporters to send thanks and notes as a SEPARATE comment, so correction-then-note is the documented shape. Judge every entry in `corrections`; dispatch on the decision and echo THAT entry's `id`. |
  | **Parent escalated?** | `parentNeedsHuman: true` → use the **needs-human answer path** above instead (clear `needs-human`, add `loop-proceed`, bake in, dispatch). One reply, one protocol — never both. Resolved from closing refs AND a `Part of #N` slice link, so a `--partial` PR's parent counts. |
  | **Brief** | Bake the correction in as **SETTLED**, like an answered escalation decision: never re-ask it, never re-derive the reading it replaced. |
  | **Worker MUST comment** | The rework ends with the marked comment below. Not optional — see the box after this table. |
  | **Gate** | Untouched. Never remove the label; never post a confirmation on the reporter's behalf. `pr automerge` still refuses with `unconfirmed interpretation`, and the reworked PR re-arms. |
  | **Ceiling** | `max-fix-attempts` reworks per PR (default 3). At the ceiling the row falls back to `awaiting_reporter` carrying `rework_ceiling` in `reasons` → `issue escalate` ONCE, don't re-poll. |
  | **`correction_unreadable`** | The PR has human-shaped comments but NO loop-machinery comment at all, so the detector refuses to read the thread (below). Escalate to a human — never hand-judge it into a rework. |
  | **`reporter_gate_stale`** | Nobody replied AT ALL and the gate has stood past `stale-pr-hours` (#439). `gateAgeHours` is the wait, anchored on the gate notice — **not** `updatedAt`, which the loop's own machinery keeps resetting. Escalate once; never nudge the PR. |

  🟡 **The three refusals arrive as WORK, once.** `rework_ceiling`,
  `correction_unreadable` and `reporter_gate_stale` stay
  `awaiting_reporter` — no rework route out — but carry **`escalateOnce:
  true`** and `needsAttention: true` (Phase A iterates `needsAttention`).
  A PR with no linked issue has nothing to escalate and stays parked. Do
  ONLY the escalation from such a row — never a rework, never a merge.

  🔴 **Once means ONCE PER (PR, REASON), EVER — and you must pass the
  key.**

  | | |
  |---|---|
  | **Command** | `renaiss-shipflow issue escalate <parent> --for-pr <pr> --once-reason <escalateOnceReason>` |
  | **Both flags, always** | The CLI refuses a half-written key (exit 1, nothing written). Copy `escalateOnceReason` verbatim off the row. |
  | **Invariant** | At most **one** escalation per (PR, reason), forever. A genuinely NEW reason on the same PR earns exactly one more. A PR is capped at one per `ESCALATE_ONCE_REASONS` entry. |
  | **Where it lives** | A hidden `escalate-once` marker inside the escalation banner — no extra comment. `inbox` reads it back off the parent's comments. |
  | **What counts as a key** | Three filters, all required: the CLI's own account authored the comment, the marker stands alone at column 0, and the comment **is an escalation banner**. A marker in any other CLI comment on the parent — an `issue wait --reason`, a loop-progress note — is prose, not a key. |
  | **`--update`** | Refused **with** a key — this is the one notification that (PR, reason) ever gets, so it must be a new comment. **Without** a key it is safe: an in-place edit carries every marker on the edited banner forward, so an ordinary re-escalation of the same parent can never erase a key already on file. |
  | **No precedent reuse** | A keyed escalation skips the precedent lookup, so it never auto-applies a stored answer and shows no `Precedent on file` suggestion. The undo cannot un-write a permanent key, so a reused-then-undone answer would park the row forever. |
  | **Write it plainly** | Marker literals inside a `--reason` are escaped before they reach the banner, **and** a key is only read out of a banner, so quoting one anywhere — an escalation reason, an `issue wait` reason, a progress note — is harmless. Only the real `--for-pr`/`--once-reason` flags file one. |

  ⚠️ **Never "just re-escalate", never key once-ness off the label:** the
  server strips `needs-human` on any non-machinery comment — label-keyed
  once-ness escalated every tick (#488). Escalate-once reasons are
  terminal until the PR's own `needs-reporter-review` clears via a
  confirmation token on the **PR thread**; a parent reply does not clear
  them. Without `--for-pr`/`--once-reason` you re-open the storm by hand.

  🟡 **"The loop already answered this" =** the worker's **`rework-from`**
  marker, only — and only up to the comment it NAMES; anything newer
  survives. The gate notice, the server's `intent-gate-hint` nudge and
  the reviewer's `loop-review` verdict never suppress. Markers count only
  from a `[bot]`/trusted author, in text they actually typed — a
  **quoted** marker is a claim, not evidence (#411).

  🔴 **The marked comment prevents rework-then-park-forever.** Nothing
  re-pings the reporter after a rework (`NotifyNeedsReporterReview` fires
  on `*.labeled` only; the near-miss nudge is once-per-PR). Post exactly
  this shape, as the LAST thing the rework does:

  ```markdown
  ## 🔁 Reworked per your correction

  | | |
  | --- | --- |
  | **You said** | <one-line quote of the correction> |
  | **New reading** | <the interpretation now implemented — one line> |
  | **Changed** | <what moved — one line> |

  <the intentGate.releaseHint sentence, verbatim from the contract>

  <!-- shipflow:rework-from id=<the id of the `corrections` entry you acted on> -->
  ```

  The `rework-from` marker is **load-bearing code**: the CLI reads `id=`
  back (same comment never re-triggers) and counts markers for the
  ceiling; `renderReworkFromMarker()` renders it,
  `SHIPFLOW_CONTRACT.intentGate.releaseHint` is the hint — copy neither
  by hand. An UNMARKED loop comment is indistinguishable from a fresh
  correction (same login), so the loop reworks against itself. **Post
  every free-text loop comment via `renaiss-shipflow pr note <n> --body …
  [--rework-from <id>]` (#603) — it carries the marker; bare `gh pr
  comment` on a loop-authored PR is BANNED** (measured, #477). Echo the
  id you ACTED on — the horizon moves there, so a mid-rework correction
  still surfaces next tick.

  🔴 **A PR with no machinery comment at all is refused outright** —
  `correction_unreadable` (measured, #401). Current-CLI-gated PRs always
  have a trail (`pr automerge` posts the marked gate notice), so this
  fires only on legacy or hand-labelled PRs — the right answer is a
  human, not a guess.
- Reconcile (A) acts only on **your own** PRs and claimed issues; don't
  touch others' unless asked.
- Blocked/escalated issues keep their claim and carry `needs-human`, so
  `issue next` advances past them. **A human reply brings the issue back**
  — the server clears `needs-human`; Phase A treats the reply as the
  decision (implement, add `loop-proceed`, never re-ask). B null **and** A
  clean → C; the run ends only when C is also empty.
- **Bug sweep files real bugs only** (Phase C): reproduced, never a
  duplicate, always `auto-qa`, at most `bug-hunt-cap` per run. No
  speculative/style nitpicks.
- **Self-regulate — WTF-likelihood:** start 0%; +15% per revert, +20% fix
  touches files unrelated to its issue, +5% per fix touching >3 files,
  +10% if only `low` severity remains. **Above ~20% → stop and
  summarize** — the loop is guessing. Smarter brake than
  `max-fix-attempts` (per-PR retries only).
- **Health gate on merge:** a negative health delta
  (`references/qa-report.md`) is treated like an unresolved thread — no
  reviewer approval, no automerge, regardless of `merge-policy`.
- **Pass ledger (mandatory, every pass end — operator requirement #608):**
  after the count line, print a compact table: one row per DISPATCH —
  `role · target (#issue/#PR) · outcome · subagent tokens` (from each Task
  return's usage metadata) — plus a totals row (dispatches, merged, tokens).
  Tokens the orchestrator itself spent go in the totals line when the harness
  reports them. No ledger = the pass is not done.
- **At the cap or an empty queue:** summarize — PRs opened, merged,
  parked-awaiting-review, escalated (with reasons) — then ask whether to
  continue beyond the cap or raise the merge policy. Intent-gate-parked
  rows: the correct copy is "N PR(s) await your confirmation token on the
  PR (or remove the `needs-reporter-review` label)" — never suggest a
  hand-merge for a gated PR (#451); "merge by hand" only for rows the
  operator can legitimately merge (e.g. policy-parked on `manual`).
  Releasing escalated claims and any `pr merge`/`release` need explicit
  confirmation. The "ask" applies only to a `once` run — **by default the
  loop is continuous**: post the one-line summary and end the turn; a
  **spawned / headless session** never asks either.
- **Continuous mode (default).** One full pass, **dormant ~15 min**,
  repeat. At run start create a recurring trigger with `CronCreate`
  (every 15 min, an off-`:00`/`:30` minute) whose prompt is the
  **fully-qualified** **`/shipflow:shipflow-loop`** — never bare
  `/shipflow-loop` (`Unknown command` when scheduler-fired); always the
  exact `<plugin>:<command>` form you were invoked as. Run the first pass
  now; re-entry is idempotent (`CronList` shows the job — don't
  re-create); each tick ends without asking (empty queue is fine).
  `/shipflow:shipflow-loop once` = single pass, no trigger; stop with
  `/shipflow:shipflow-loop stop` (`CronDelete`), then worktree cleanup.
  The trigger fires only while Claude Code runs/idles, may be
  session-scoped (cmux, ~7-day expiry); for always-on, an external
  scheduler (cron / launchd / GitHub Actions) drives
  `/shipflow:shipflow-loop once`. Codex CLI has no CronCreate — external
  scheduler only; subagent dispatch degrades to inline roles
  (`references/codex.md`).

## Message style — everything you write on GitHub (comments, PR bodies, issue bodies)

**This is the one authoritative copy** — `loop-worker.md`,
`loop-reviewer.md`, and `pr-feedback.md` point here; edit the contract
here only. Every message exists so a phone-skimming human can **judge it
in seconds**: graphics first, words last. For each piece of information,
use the FIRST format on this list that fits — prose is the fallback,
never the default:

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

### Issue-body ladder — every ShipFlow-filed issue body

**Authoritative for EVERY issue body ShipFlow files** — loop bug-sweep /
auto-qa issues, Phase-B follow-up sub-issues, feature-relate auto-issues,
harvest-filed issues, hand-filed `/shipflow-new-issue`. Issue #387 is the
live demo. Build top-down:

| # | Element | When | Shape |
|---|---|---|---|
| 1 | **Status header** | always — the first line | one blockquote line: `> <priority emoji> **P<n> · <type> · <area> · effort <S/M/L>** · <wave/source>` |
| 2 | **Body core** | always | bug → the Repro core below; feature/task → **Why** + **What** (≤3 bullets each) |
| 3 | **Mermaid diagram** | the defect or design has a flow, sequence, or state shape | small `flowchart`/`sequenceDiagram`/`stateDiagram` — beats prose causality |
| 4 | **Evidence table** | any `file:line` claim | `\| Claim \| Where \|` — every claim grounded in `path:line` / links / screenshots |
| 5 | **Acceptance checklist** | always | `- [ ]` items — the reviewer's coverage gate checks them 1:1 |
| 6 | **`<details>` folds** | long logs, alt options, raw data | collapsed at the bottom, never unfolded |

Priority emoji: 🔴 P0 · 🟠 P1 · 🟡 P2 · 🟢 P3. Wave/source examples:
`auto-qa sweep`, `Part of #N`, `wave 3`, `hand-filed`. All general rules
above apply (≤30 words per cell, blank line between sections, prose
last).

**Bug-body core** — element 2's shape (blank lines are load-bearing):

```
**Repro**
1. <step>
2. <step>

**Expected** <one line>

**Actual** <one line>

**Impact** <one line> · severity:<level>
```

Screenshots/links land in the evidence table (element 4); the acceptance
checklist (element 5) still closes a bug body — minimally
`- [ ] <actual> no longer occurs; <expected> observed`.

### Commit messages: invoke the smart-commit skill

**Create every loop commit by INVOKING the bundled `smart-commit` skill**
— the Skill tool with the PLUGIN-QUALIFIED name
**`shipflow:smart-commit`** (#544: a bare name can resolve to another
plugin's same-named skill — same ambiguity class as the fully-qualified
`/shipflow:shipflow-loop` rule). No Skill tool / plugin namespace (Codex)
→ read and follow the skill file from the **plugin clone**:
`~/.shipflow-skill/skills/smart-commit/SKILL.md` (`references/codex.md`)
— plugin-relative `skills/smart-commit/SKILL.md`, never the loop
worktree, never a bare name. Not a hand-written `git commit`: the skill
splits the staged diff into atomic units and writes Angular conventional
messages — let it do categorize / split / format. One authoritative copy;
`loop-worker.md` and `pr-feedback.md` point here.

What the skill produces (sanity-check its output):

- **Format**: `type(scope): subject` — `feat`/`fix`/`docs`/`refactor`/
  `test`/`perf`/`chore`/`ci`/`build`/`style`; imperative subject, no
  capital, no period, ≤50 chars; body wrapped at 72 (*what and why*);
  footer = the `Closes #N` / `Part of #N` reference (matching the PR
  body).
- **Atomic**: one logical unit per commit — new-construct / modification
  / config / docs / refactor / bug-fix / test split out; the regression
  test may ride with its fix (step 4).
- **Pre-commit**: lint + format clean before committing (step 4's tests
  satisfy the skill's test gate).
- **No AI-attribution trailer** — the skill's default; loop commits keep
  it (owner decision, #279). Footer = issue reference only;
  loop-authorship stays traceable via branch, PR, and account.

**One autonomous adaptation** (the loop has no human; the skill assumes
one): **skip the human-confirm gate** — execute the plan the skill
produced directly; the reviewer gate and your own tests are the
confirmation. Never block waiting for a human that isn't there (the
Spawned/headless posture in SKILL.md). Everything else applies as
written.

Do NOT edit the vendored `skills/smart-commit` skill to encode this — it
stays re-syncable; the one autonomous adaptation lives here.
