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
4. **The cycle** — 0 CLI drift check · A reconcile in-flight · B admit new work · C bug sweep · D repeat/stop
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
  PRs merged OUTSIDE those commands — GitHub UI, `gh pr merge`, the dashboard, a
  human releasing the intent gate — are healed by the **merged-branch GC** that
  `inbox` runs each tick (issue #455): any local `fix/*` branch whose PR merged
  at exactly the local tip gets the same cleanup (dedicated worktree removed,
  loop worktree detached, branch deleted); a tip with unpushed commits — or a
  holding worktree with uncommitted edits — is kept and reported
  (`summary.gcUnpushedKept`) for a human to judge.
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
| `max-fix-attempts` | `3` | CI-fix tries on one PR before escalating to a human — also caps reporter-correction reworks (#442) |
| `wip-limit` | `10` | max open PRs you own before you stop admitting new work |
| `stale-pr-hours` | `48` | a green, unreviewed PR older than this is `stale` → ping/escalate |
| `bug-hunt` | `true` | when the queue is empty, run a test+QA sweep and file issues for bugs found (Phase C) |
| `bug-hunt-cap` | `5` | max NEW issues the bug sweep may file per run |
| `require-review` | `true` | route every issue (intake) and PR (pre-merge) through the reviewer subagent first |
| `cli-drift-poll-seconds` | `180` | how long the post-merge CLI drift check waits for npm to publish before continuing degraded (§0) |

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

### 0. CLI drift check — POST-MERGE (primary) · TICK-START (backstop)

Every verdict this loop reaches — inbox `state`, `pr ready`, `pr automerge` —
comes from whatever `renaiss-shipflow` PATH resolves, and **drift is
directional**: an older CLI knows about fewer blockers, so it reports *fewer*
reasons to park and biases toward merging what should hold. A binary twelve
versions behind classified a `CONFLICTING` PR as `approved_ready`,
`readyToMerge: 1` — and the loop had created that drift itself, by merging its
own fix (issue #435).

**Neither trigger alone suffices — run both:**

| Trigger | Catches | Misses on its own |
|---|---|---|
| **post-merge** (primary) | the version your own merge just published | drift a fresh session inherited |
| **tick-start** (backstop) | drift from before this session | a whole tick on the binary the merge obsoleted |

**Procedure** — `renaiss-shipflow version --json` → read `drift`
(`current`/`stale`/`ahead`/`unknown`), `registry.latest`, `channel`,
`remediation`. (`version --check` is the same probe as an exit code: **9** =
stale, 0 = anything else, for a scripted gate — but a binary predating the gate
rejects the flag entirely, which is step 1's `legacy-stale` case, not a pass.)

1. **Tick start** — probe **once**, no poll (nothing is publishing). Then read
   the answer's SHAPE before its content:

   | Probe answer | Means | Do |
   |---|---|---|
   | `drift` key present, not `stale` | gate ran, binary is fine | continue immediately |
   | `drift` key present, `stale` | gate ran, binary is behind | step 3 |
   | **no `drift` key** in `version --json` | gate **could not run** | **legacy-stale** → 1a |
   | **`version --check` exits 1** / `unknown option` | gate **could not run** | **legacy-stale** → 1a |

   **A missing gate is not a passing gate.** The drift gate ships *inside* the
   binary it polices, so on the day it lands the binary on PATH is the previous
   release. Measured on the live 0.28.2: `version --json` → `{cli, plugin,
   server}` with **no `drift` key**; `version --check` → **exit 1**, `error:
   unknown option '--check'`. Read as "not stale → continue", the exact stale
   binary this gate exists to repair green-lights itself and is never upgraded.
   Exit **1** is never a gate verdict — the gate exits only **9** or **0**.

1a. **Legacy-stale bootstrap** — the gate can't tell you, so read both sides
   yourself and remediate before anything else this tick:

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

   `$LATEST` empty (offline) → warn once, **continue degraded** — never halt.
   `$INSTALLED` older than `$LATEST` (compare with `sort -V`, not string
   equality) → remediate via the step-3 channel table using `$REAL`, then
   re-read `--version` (step 4). After a verified upgrade the new binary answers
   `version --json` with a `drift` key and every later tick uses the normal path.
2. **After each merge that could publish a CLI** — **poll** until
   `drift: "stale"` appears or the window closes.

   **Scope the poll first: did this merge touch `apps/renaissshipflow-cli/**`?**

   ```bash
   gh pr view <n> --json files --jq '[.files[].path | select(startswith("apps/renaissshipflow-cli/"))] | length'
   ```

   `0` → **skip the poll entirely** and continue. A merge that publishes no CLI
   can never make your binary stale, so the window buys nothing — and it is
   charged per merge: every server-only ShipFlow change, and **every merge in
   every other repo the loop runs against**, would otherwise stall ~3 minutes.
   The tick-start probe (step 1) still catches anything this skips.

   Non-zero → poll. Publishing lags a merge by **~62s** (measured: #441 merged
   05:19:07Z, npm had 0.28.2 at 05:20:08Z), so the registry legitimately still
   shows the old version right after your merge. Probe every ~15s up to
   `remediation.pollWindowSeconds` (`config get cli-drift-poll-seconds`,
   default 180, env `SHIPFLOW_CLI_DRIFT_POLL_SECONDS`). Window closes with no
   stale reading → continue; the next tick-start catches it.
3. **On `stale` — run `remediation.command` verbatim.** It **branches on
   `channel`**, and a remediation that runs cleanly against the wrong channel
   fixes nothing (this bug recurring inside its own fix):

   | `channel` | realpath contains | command |
   |---|---|---|
   | `plugin-launcher` | `/.claude/plugins/cache/` | `claude plugin update shipflow@renaissshipflow` |
   | `launcher-cache` | `/.shipflow/cli/` | `"$PLUGIN_DIR/bin/shipflow-cli-update" --force` |
   | `npm-global` | `/node_modules/@renaiss-shipflow/cli/` | `npm i -g @renaiss-shipflow/cli@<registry.latest>` — an **exact** version |
   | `unknown` | anything else | none — banner, then continue (a dev checkout; a human decides) |

   **Match the rows top-down — the order is the fix.** `launcher-cache` is the
   npm copy `bin/shipflow-cli-update` fetches into
   `~/.shipflow/cli/<version>/node_modules/@renaiss-shipflow/cli/` for
   `bin/renaiss-shipflow` to pick up (issue #307). It **contains the
   `npm-global` substring**, so matching `npm-global` first sends `npm i -g`
   into a prefix the launcher never scans: exit 0, nothing fixed, running binary
   exactly as stale. `renaiss-shipflow version --json` already applies this
   order — prefer its `channel` + `remediation.command` over hand-matching, and
   hand-match only on the legacy path (1a), where the binary can't tell you.

   **Never a bare `@latest`.** npm 10.9.2 sets `preferOnline` for `npm view`
   but not for `npm install`, which serves dist-tags from a cache for up to
   300s — so once a losing install cached the old tag, every later `@latest`
   install stayed stale. An exact-version spec is not a tag lookup and refetches.
4. **Verify by the version STRING, never by the exit code.** Re-read
   `renaiss-shipflow --version` and compare it to the reading you took before.
   `npm i -g …@latest` was reproduced printing `changed 12 packages in 2s` on
   **exit 0** with the version unchanged. Same string = the upgrade did not
   happen, whatever npm said.
5. **Continue either way — NEVER halt the tick.** Verified upgrade → carry on.
   Unverified → print a loud one-line banner naming installed vs registry
   (`⛔ CLI DRIFT: installed 0.27.10 · registry 0.28.2 · channel npm-global —
   verdicts may under-report blockers`) and **CONTINUE DEGRADED**. A
   refuse-on-gap gate would deadlock the loop after *every merge it performs*,
   because the publish lag is guaranteed. Auto-upgrade → verify → warn; never
   refuse.

`drift: "unknown"` (offline, registry blip) is **not** stale: warn once and
continue — an offline loop degrades, it doesn't stop.

**Provenance:** `inbox`, `pr packet` and `pr reviews` each stamp
`cli: {version, channel}` into their `--json` envelope, so any verdict in the
transcript can be traced back to the binary that produced it after the fact.

### A. Reconcile in-flight work — dispatch a worker per item

Run the **tick-start drift probe** (§0, one call), then `renaiss-shipflow inbox
--json` (compact — this is all *you* read). For each PR whose `state` needs
action, **dispatch a worker subagent** (Task tool) scoped to that one PR and
collect its return. Loop A until nothing in-flight `needsAttention`:

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
  **On a merge that actually lands, run the POST-MERGE drift check (§0) before
  the next dispatch** — merging a ShipFlow PR publishes a new CLI, and every
  later verdict this tick would otherwise come from the binary that merge just
  obsoleted. That is exactly how all four measured occurrences were created.
  **`"unsatisfiable": true` in the automerge JSON = ESCALATE, do not re-poll**
  (issue #305). It means a blocker can never clear by waiting — today: `require-ci`
  is on but the repo has NO CI configured. Re-running the same tick can only give
  the same answer, so `issue escalate <issue> --category external-dependency` ONCE
  with the two remedies as the recommendation (add a workflow that runs on PRs ·
  `config set require-ci false`), then move on. Never leave a PR spinning on a
  blocker that has no path to clearing.
- `conflict` → worker resolves it agentically: `renaiss-shipflow pr sync <n>
  --keep-conflicts` (exit 6 = rebase left mid-flight + conflicted-file list),
  then `references/conflict-resolution.md` — resolve by intent, stage only
  resolved paths, `pr conflict-check --base origin/<base>` (exit 8) before each
  `rebase --continue`,
  TEST before any push, force-with-lease, comment the resolution on the PR; the
  reviewer gate re-runs. Escalate only per that doc's criteria, never on the
  mere existence of a conflict. Scope is the loop's OWN PRs unless the
  **opt-in** repo-wide sweep is enabled (`config set conflict-sweep true`,
  default off) — and even then only **trusted** heads (same-repo,
  `OWNER`/`MEMBER`/`COLLABORATOR`, no drafts) are actionable; `humanOnly: true`
  rows are for a human to look at, never for the loop to check out.
- `reporter_corrected` → **rework it — the reporter has answered** (issue #442).
  Same gated PR, except a trusted non-machinery comment has landed that the loop
  has not acted on. The row carries the reply itself — `correction: {id, author,
  at, url, excerpt}` plus `parentNeedsHuman` — so you judge it without a second
  API call. The gate stays ON throughout: nothing here merges, and the reworked
  PR re-arms. Protocol (decision-vs-question, the `needs-human` parent fork, the
  mandatory marked comment, the ceiling) → § "A reporter correction IS the human
  answering" under Guardrails. **Judge before you dispatch:** a question or
  chatter is not a correction, and burns a worker cycle.
- `awaiting_reporter` → **park — the reporter must confirm; re-checked next tick.**
  The PR carries `needs-reporter-review`: a worker's interpretation/deviation is
  unconfirmed (issue #190), so no policy will merge it and only the reporter (or a
  maintainer removing the label) can clear it. Silence parks forever, by design —
  a *reply* is what moves it, and a correcting reply arrives as
  `reporter_corrected` above. The **one** exception is a row carrying
  `escalateOnce: true` — the loop hit the rework ceiling, or refused to read the
  thread — where the whole action is a single `issue escalate` and the row parks
  again as soon as the parent carries `needs-human`. **It outranks `conflict`** — and
  every other state — because each route below it tells a worker to *act on the
  PR*, and acting can destroy the gate: the label is self-clearing (issue #411),
  the loop's own comment strips it, and the `conflict` route *requires* commenting
  the resolution on the PR. So dispatching an intent-gated conflicted PR to a
  conflict worker risks the loop clearing the very gate holding it. The conflict is
  still reported — `reasons` carries **both** `needs-reporter-review` and
  `merge_conflict` — only the dispatch is withheld until the reporter replies.
  (This reverses issue #393's "conflict outranks everything" for this one
  intersection: #393's rationale was signal *staleness*, orthogonal to *may the
  loop act at all*.)
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
   the brief. It first runs the MANDATORY **security diff scan** (loop-reviewer.md §0b — the `security-review` skill on the PR branch, findings fix-or-refuted like bot threads; the deeper /claude-security scan stays a human-run recommendation; a skipped scan is stated loudly and parks code diffs), then checks **external reviews** (`renaiss-shipflow pr reviews <n>
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

Ladder, highest first: `reporter_corrected` › `awaiting_reporter` › `conflict` ›
`ci_failing` › `changes_requested` › `review_comments` › `ci_pending` ›
`approved_ready` › `stale` › `awaiting_review`.

`awaiting_reporter` outranks everything below it — `conflict` included — because
every route below dispatches a worker to *act on the PR*, and an interpretation
nobody has confirmed must not be reworked, rebased or merged **until the human
answers**. (The original reason was mechanical: the label was **self-clearing** —
a loop comment stripped it, and the `conflict` route requires commenting on the
PR. #411 closed that hole; the ordering stays for the reason under it.) Both
reasons are still reported, so nothing is hidden — only the dispatch waits.

`reporter_corrected` sits one rung above it, and is where the second half of that
sentence finally means something (issue #442). "Until the human answers" was
written as a rule and implemented as a full stop: a reporter who answered got the
same parked row as one who said nothing, byte for byte. **A correction IS the
human answering** — the one input that resolves the ambiguity the gate is holding
for — so the *rework* is admitted. Nothing else loosens: the label stays, `pr
automerge` still reports `unconfirmed interpretation`, a bare rebase and a merge
are still withheld, and the reworked PR re-arms on a newer unconfirmed reading.
Silence still parks forever.

| `state` | What it means | Action |
|---|---|---|
| `reporter_corrected` | still gated, and the reporter replied with a correction | rework per § "A reporter correction IS the human answering" — brief it as settled; the gate stays ON |
| `awaiting_reporter` | approved + green, interpretation unconfirmed (`needs-reporter-review`) | park — the reporter must confirm; re-checked next tick. **Unless the row says `escalateOnce: true`** (`rework_ceiling` / `correction_unreadable`) → `issue escalate` ONCE, nothing else |
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
  banner and **any** `<!-- shipflow:` marker, not by author — the loop comments
  under the operator's account). So any comment the loop posts on a `needs-human`
  issue *without* resolving it (progress notes, slice links) MUST end with
  `<!-- shipflow:loop -->`, or the comment itself will un-park the issue.
  `issue escalate` output needs no marker — the 🚧 banner already exempts it.
  Markers are matched by **prefix**, not by a list (issue #411): a comment
  carrying `<!-- shipflow:loop-review -->`, `<!-- shipflow:precedent-applied …`
  or any future marker is machinery too.
- 🔴 **`needs-reporter-review` is the opposite polarity — it does NOT clear on
  any reply.** It is the #190 intent gate: a merge blocker held until a human
  confirms a worker's reading. The server clears it **only** on an explicit
  affirmative and **ignores unknown prose** (issue #411 — a plain loop comment
  used to strip it in seconds, and PR #405 merged with the gate machine-cleared
  and the reporter never consulted). Two rules follow:

  | On a `needs-reporter-review` PR | Rule |
  | --- | --- |
  | **Any comment the loop posts** | MUST carry a `<!-- shipflow:` marker — `pr approve --comment` and `pr post-review` stamp `<!-- shipflow:loop-review -->` for you; a hand-written `gh pr comment` does not |
  | **Releasing the gate** | only the reporter, with a reply that is ONLY `confirmed` / `/confirm` / `approved` / `yes` / `lgtm` / `sgtm` / `ship it` / `+1` / 👍 and nothing else — never the loop |
  | **Correcting the reading** | leaves the gate ON, by design: rework the PR — the loop now DOES, via `reporter_corrected` (see below) |
  | **A QUALIFIED yes** | also leaves it ON — `yes but change the copy first` is a correction, not consent |
  | **Prose that reads as consent** | also leaves it ON — even `Confirmed — ship it`, because it is not the token |
  | **A token with ANYTHING under it** | also leaves it ON — one newline or one blank line, a correction or a thank-you |
  | **Human override** | remove the label in the GitHub UI |

  It is an **exact token that is the whole reply**, not a grammar: markdown
  decoration and trailing punctuation are stripped (`**Confirmed**`, `- lgtm`,
  `Confirmed.` all work), but a token embedded in a sentence never decides, and
  neither does one with anything after it — including a pasted fenced block.
  The rule already refused extra words on the token's own line, so
  accepting them one newline later would be the same act with the opposite
  answer. That is deliberate — an affirmative opener plus a negation list is a
  denylist guarding unbounded natural language, which fails OPEN on the first
  phrasing nobody enumerated; this refuses when anything follows without ever
  inspecting it. A reply that misses gets **one** nudge on the PR naming every
  token and pointing commentary at a separate comment.

  The loop **never** clears this gate on the reporter's behalf. Every removal
  the server performs posts an attributable audit comment naming the actor and
  quoting their line — if the label vanished and no such comment exists, treat
  it as a bug, not a confirmation.
- 🟢 **A reporter correction IS the human answering — rework it** (issue #442).
  The row above says a correction "leaves the gate ON, by design: rework the PR",
  and the server's near-miss nudge promises the reporter the same thing in so
  many words. Nothing did. `awaiting_reporter` only parked, and the inbox row was
  byte-identical with and without their reply — so a reporter who did exactly
  what the system asked got silence, no nudge (`awaiting_reporter` outranks
  `stale`, #439) and no way out.

  `inbox` now classifies such a PR **`reporter_corrected`** — ranked immediately
  above `awaiting_reporter`, `needsAttention: true`, `reasons:
  ["needs-reporter-review", "reporter_correction"]` — and puts the reply ON the
  row: `corrections: [{id, author, at, url, excerpt}, …]` (**every** unanswered
  comment, OLDEST first) with `correction` = `corrections[0]`, plus
  `parentNeedsHuman`. Summary gains `reporterCorrected`; the PR leaves `parked`.

  The CLI decides only the deterministic half — *which comments here has the loop
  not already answered?* You decide the rest, by the same judgement the
  `needs-human` trigger already asks of you:

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

  🟡 **The two refusals arrive as WORK, once.** `rework_ceiling` and
  `correction_unreadable` stay `awaiting_reporter` — there is no rework route out
  of either — but the row carries **`escalateOnce: true`** and
  `needsAttention: true`, because "escalate once" is an instruction Phase A can
  only follow on a row it actually visits, and Phase A iterates `needsAttention`.
  Once-ness needs no new state: `issue escalate` puts `needs-human` on the parent
  issue, which is exactly what makes `escalateOnce` false on the next tick, and
  the row parks. A PR with no linked issue has nothing to escalate and stays
  parked. Do ONLY the escalation from such a row — never a rework, never a merge.

  🟡 **What counts as "the loop already answered this".** Exactly ONE comment
  suppresses: the worker's **`rework-from`** marker, and it suppresses up to the
  comment it NAMES, so anything newer survives. Every other marked comment either
  preceded the reply (the gate notice) or responded to it without acting on it —
  the server's `intent-gate-hint` nudge, posted on *every* correction seconds
  after it lands, and the reviewer's `loop-review` verdict on the current head.
  Both used to bury the correction they followed. The marker is read only from a
  `[bot]` author or a trusted association, and only from text the author actually
  typed: **quoting** a marker (GitHub's Quote reply copies them verbatim) is a
  claim, not evidence — the same rule as the intent-gate audit record (#411).
  This is why the marker is mandatory: forget it and the loop re-offers the same
  comment until the ceiling stops it.

  🔴 **The marked comment is what keeps this from becoming
  rework-then-park-forever.** Nothing re-pings the reporter after a rework:
  `NotifyNeedsReporterReview` fires on `*.labeled` only and the label never
  re-applies, and the near-miss nudge is once-per-PR. A silent rework leaves a
  *newer* unconfirmed reading in the same silence — worse than where it started.
  Post exactly this shape, as the LAST thing the rework does:

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

  The `rework-from` marker is **load-bearing code, not a convention**: the CLI
  reads `id=` back so the same comment can never re-trigger, and counts the
  markers for the ceiling. `renderReworkFromMarker()` renders it and
  `SHIPFLOW_CONTRACT.intentGate.releaseHint` is the hint — copy neither by hand.
  Its absence is the anti-self-loop failure: an UNMARKED loop comment on a gated
  PR is indistinguishable from a fresh reporter correction (same login, same
  association — that is why no author filter exists here), so the loop reworks in
  response to itself until the ceiling stops it. Echo the id of the entry you
  ACTED on: the horizon moves to that comment, so a correction that arrived while
  the worker was running is still waiting on the next tick instead of being
  buried by the answer to an older one.

  🔴 **A PR with no machinery comment at all is refused outright**, with
  `correction_unreadable` on the row. This is not theoretical: PR #401, the live
  gated PR, carries three UNMARKED `MEMBER` comments — an old reviewer verdict, a
  brief summary, and a parking note signed `<sub>🤖 ShipFlow loop …</sub>` — every
  one of them written by the loop and every one indistinguishable from a human
  correction by content or by author. Reading that thread would have dispatched a
  rework in reply to the loop's own parking note. Every PR gated by a current CLI
  has a trail (`pr automerge` posts the marked gate notice as it applies the
  label), so this only ever fires on legacy or hand-labelled PRs — where the
  right answer is a human, not a guess.
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
