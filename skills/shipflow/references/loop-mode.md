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

1. **Setup** — worktrees (`loop-setup.md`, once per run)
2. **Policies** — the knobs (`loop-setup.md`, once per run)
3. **Roles** — orchestrator · reviewer · worker
4. **The cycle** — usage gate · 0 CLI drift check · A reconcile · B admit · C bug sweep · D repeat/stop
5. **Reconcile playbook** — inbox `state` → action
6. **Guardrails** — merge path · dispatch-don't-do · WTF-likelihood

Sub-references: `loop-setup.md` (run start, not every tick) ·
`loop-worker.md` · `loop-reviewer.md` (PR gate) ·
`loop-reviewer-intake.md` (issue intake) · state cards loaded on demand —
`loop-gate.md` · `loop-bug-sweep.md` · `message-style.md` — plus
`browser-testing.md` · `bug-taxonomy.md` · `qa-report.md` · `pr-feedback.md`.

## Setup — run in a worktree (once, before the cycle)

`loop-setup.md`. Orchestrator loads it **once per run** (tick 0 / before
the cycle), not every tick — worktree, knobs, continuous trigger.

## Policies — the three knobs (set once, then trust them)

`loop-setup.md` — same load-once as Setup.

## Roles — three subagents the orchestrator dispatches

Dispatch via the **Task tool**; fresh context each, compact payload back —
the heavy work never enters yours.

- **orchestrator** = you. Read compact JSON (`inbox`, `issue next`,
  `features`, subagent returns), decide, dispatch, count vs `cap`. **Never
  read source files or diffs yourself.** Independent workers go out in ONE
  message (parallel Task calls), up to `loop-concurrency` in flight (#744);
  the SERIAL steps — claims, merges, drift check, ledger — you run yourself,
  one at a time, between dispatch waves.
- **reviewer** — the mandatory gate (`require-review`, default on). Pulls
  `renaiss-shipflow features --json`, reviews an **issue at intake**
  (validate, map to features, acceptance brief) and a **PR before merge**
  (cross-feature impact, regressions, brief met; approves with the approve command).
  Contracts: intake → `references/loop-reviewer-intake.md`; PR gate → `references/loop-reviewer.md`.
- **worker** — fixes ONE issue end-to-end (branch → fix → test → PR →
  evidence), returns `{pr, verified, blocked}`; also runs reconcile fixes.
  Contract: `references/loop-worker.md`.
  - **Worker model knob:** at run start read `renaiss-shipflow config get
    loop-worker-model` (env `SHIPFLOW_LOOP_WORKER_MODEL` overrides). If set,
    pass as Task `model` on every **worker** dispatch — fix and reconcile
    alike; NEVER the reviewer or QA. Best-effort; unset → match the model
    to the task (next).
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

## The cycle — each tick

**Tick 1 only — lay out the Initial Plan before ANY dispatch (#600).** After
the drift probe, run `renaiss-shipflow loop plan --json` (READ-only — never
`issue next`) and render its envelope as the plan block. Do not rebuild it
from `inbox --json` or `renaiss-shipflow issues list --assignee @me
--state open --json`, and do not re-derive actions from this file's
playbook table.

| Envelope | Render as |
|---|---|
| `policies` | merge-policy · require-ci · cap · wip-limit · pickup-scope · intent-gate, one line |
| `reconcile[]` | one row per in-flight PR: `#N · state · action` (`escalateOnce` / `unsatisfiable` when set) |
| `admit[]` | the scope's eligible issues in pickup order, up to `cap`: `#N · priority · title` |
| `deferred[]` | anything visible but not actionable this run (`reason`: parked / waiting-on / over-cap / …) |

The operator's chance to interrupt a wrong plan before workers spend tokens;
later ticks print only the one-line summary — never repeat the plan block.

### Usage gate — TICK-START, before everything else

The loop runs on the operator's Claude subscription. Once the account's
**5-hour or weekly usage is at/above `usage-max`** (default **90%**, token
`usage-max=N` / `$SHIPFLOW_LOOP_USAGE_MAX`) a tick must not start: a
dispatched worker that hits the limit mid-fix leaves a half-done branch,
and the operator loses the rest of the window to the loop. Check **every
tick, first — before the Initial Plan, the drift probe, `inbox`, any
dispatch** (operator requirement, 2026-09-04).

```bash
PLUGIN_DIR=$(ls -d ~/.claude/plugins/cache/renaissshipflow/shipflow/*/ 2>/dev/null | sort -V | tail -1)
# threshold: an explicit `usage-max=N` token → `--max N`; otherwise
# shipflow-usage resolves $SHIPFLOW_LOOP_USAGE_MAX, then 90.
"$PLUGIN_DIR/bin/shipflow-usage" check --text
```

| Exit | Means | Do |
|---|---|---|
| **3** | 5h or 7d usage ≥ max (the line names the window and its reset time) | post `⏸ paused · usage <line> · rechecks next tick` as this tick's ONLY output and **end the tick**. No plan, no drift probe, no `inbox`, no dispatch. Keep the cron — the next tick re-checks; the window resets on its own. |
| **2** | cannot tell — no snapshot, unusable `recorded_at`, or a snapshot older than `--max-age` (1h) that was below max | **continue**, and add `usage: unknown (<reason>)` to the summary line. Tick 1: run `"$PLUGIN_DIR/bin/shipflow-usage" install-statusline` (idempotent; exit 4 = a foreign statusLine exists — print its chain hint, never overwrite). The sink starts reporting from the next Claude Code session. |
| **1** | bad `usage-max` / `--max` / `--max-age` (not a number, or out of range) — stderr says so | **continue**, and add `usage: gate misconfigured (<stderr>)` to the summary line so the operator fixes the token; never treat it as a pass |
| **0** | below max, or the account reports no limits | continue; nothing to say |

Where the number comes from: Claude Code hands the 5h / 7d percentages only
to the **statusline command** (`rate_limits.five_hour.used_percentage`,
`rate_limits.seven_day.used_percentage`, `resets_at` — documented at
https://code.claude.com/docs/en/statusline; subscribers only, after the
session's first API response). `shipflow-usage
record` is that command — it snapshots them to `~/.shipflow/usage.json` on
every refresh, and `check` reads the snapshot. A stale reading is a lower
bound (usage only grows until a window resets), so stale-and-over is still
**3**; stale-and-below is **2**, never a pass. There is no other sanctioned
source: do not scrape `/usage`, do not call OAuth endpoints with the
keychain token, do not estimate from token counts.

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
worker scoped to that PR — workers for DIFFERENT PRs may run concurrently,
up to `loop-concurrency`, each in its own worktree (§ Setup, #744); what
never fans out: `pr automerge` (one call, oldest-first), post-merge syncs
(dispatch after automerge returns), and the post-merge drift check. Loop A
until nothing in-flight `needsAttention`. Own PRs and claimed issues only
— don't touch others' unless asked. Every free-text loop comment on a
loop-authored PR goes through `renaiss-shipflow pr note <n> --body …
[--rework-from <id>]` (#603); bare `gh pr comment` is banned (measured,
#477). Gated-PR / `needs-human` comment protocol → `loop-gate.md`.

- `ci_failing` → worker fixes failing checks (`gh pr checks <n>`), pushes.
  Track attempts across ticks; `max-fix-attempts` still red →
  `renaiss-shipflow issue escalate <issue> --category <cat> --reason "CI red after N attempts: …"`.
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
  unresolved** — hard gate; parks on `manual`). **automerge owns
  review-settle (#687):** an immediate thread count of 0 is not settled.
  It waits up to 120s since the last head (or until an external review
  lands; the loop's own reviews / `shipflow-approved` do not count), then
  re-reads threads immediately before merge. After 120s, zero is accepted.
  `pr ready` reports the settle blocker and does not sleep. **A merge
  that lands → POST-MERGE drift check (§0) before the next dispatch.**
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
  row schema → `loop-gate.md` § "A reporter correction IS the human answering".
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
- `ci_pending` → `park` (don't busy-wait). `needs_review` → `review` —
  dispatch the loop-reviewer (`pr packet` → security scan → approve); a
  green PR the reviewer has not seen is unfinished work, not a park, at ANY
  age. `stale` / `awaiting_review` → the loop is out of review moves (it
  already reviewed this head, or the PR is a draft / links no issue): `nudge`
  once aged, park until then. **The reviewer is never dispatched twice at one
  head** — its own unresolved findings are `review_comments` → a WORKER, and
  that is what makes review → fix → re-review terminate.
- `merged_unreviewed` → already on `main` without a pre-merge review
  (#552). `park` — never automerge / review / rebase. `escalateOnce: true`
  → `issue escalate <parent> --for-pr <pr> --once-reason merged_unreviewed`
  ONCE, then park until `stale-pr-hours` drops it. Post-merge label or
  review does not hide the bypass.

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
  the one-line comma form; **`1. answer`, `1) answer` and `1 - answer` are
  read the same way** (#969 — a human who answers a numbered list with a
  numbered list is answering; renaiss-os-index #1535's "1. All / 2. OK Me"
  sat unread for 15 days). Parse with `parseDecisionRepliesLoose`
  (`apps/renaissshipflow-cli/src/escalation-format.ts`; the strict
  `parseDecisionReplies` stays the grammar for merge-authorization
  confirmations only); mark answered items
  resolved by editing the live 🚧 comment in place with the **existing**
  `renaiss-shipflow issue escalate <n> --update` (PR #59 — no new CLI/server
  surface). **Clear `needs-human` only when ALL are answered** — a partial
  reply stays escalated and keeps its claim. Bake answers into the brief as
  **settled**.
- **Acknowledged within a tick, always** — the human must never wonder
  whether the reply was read. The server webhook clears `needs-human` and
  posts one line, `✅ **Reply received** — read as \`1: All\` · \`2: OK Me\`;
  the loop resumes on its next pass.` (ending in `<!-- shipflow:loop -->`,
  so it is machinery). Where the webhook never fires (#798), **`issue next`
  heals it**: any needs-human issue whose latest 🚧 banner has a human
  comment after it gets the label cleared, the same ack posted, and
  competes that tick (`healed[]` in `--json`). A reply the loop cannot
  parse into `N:` items is acknowledged as "a free-text decision" and
  handled by the Trigger rule above.
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
issue is `needs-human`-escalated still counts; PR #470). `merged_unreviewed`
is already on main (#552) — excluded too. `wipActionable` ≥
`wip-limit` → skip B (drain A). Else admit up to **`loop-concurrency`**
issues at once (default 3, #744) while in-flight fix workers +
PRs-opened-THIS-PASS < `cap` — each step still a fresh subagent:

- Steps 1–2 run per issue. **Picks are SERIAL** — the `issue next` claim is
  the mutex; never two Picks in flight. Intake reviews may fan out.
- Step 3: dispatch the admitted batch's fix workers in **ONE message**
  (parallel Task calls), each in its own worktree + scratch dir (§ Setup).
- Step 4 dispatches per worker as it returns; a freed slot re-admits
  immediately (back to step 1) while under `cap`.
- Serial stays serial at ANY concurrency: claims, merges (ONE
  `pr automerge --all-ready`, oldest-first — Phase A), the post-merge drift
  check, ledger bookkeeping. `loop-concurrency 1` = the old one-at-a-time
  flow, unchanged.

**Cap is per pass, not per session** (#451): continuous mode RESETS the
counter each tick; "🛑 at cap" only in a tick that itself opened `cap` PRs.

1. **Pick** — `renaiss-shipflow issue next --json` (claims the next
   open/unclaimed issue **assigned to the account running the loop** —
   `pickup-scope` defaults to `assigned` (#600): assigning IS the queueing
   gesture; unassigned issues are invisible. `config set pickup-scope all`
   = repo-wide pickup. Ordering: priority → severity → newest; optional
   `--label bug`; skips `needs-human`/claimed).
   - **Merged-slice parents (#532):** skip a parent named by a merged
     `Part of #N` PR when every open child citing it is itself
     non-actionable (vacuous if none). No `slice-merged` label; children
     stay independently pickable.
   - **Intake gate (#448):** author association not
     `OWNER`/`MEMBER`/`COLLABORATOR` (or unreadable — fails closed) →
     labelled `needs-reporter-approval`, **not claimable** until a trusted
     confirmation token (same list as the #411 merge gate) or someone
     with **triage or above** removes the label (GitHub-enforced). Non-code
     contributors confirm in chat, where ShipFlow knows their identity.
     Unset = `code-org`.
     - **Arming happens ONCE** — hidden `shipflow:intake-gated` marker in
       the gate comment; a trusted token or a named human unlabeled
       sticks (never re-applied) and IS the approval. **Only a
       LOOP-AUTHORED marker counts** (`viewerDidAuthor === false` →
       ignored). The arming comment advertises `intentGate.releaseHint`.
     - **Approval = the removal EVENT, not label absence:** read the
       `unlabeled` timeline live; a **named human** unlabeled still
       approves; a **bot** unlabeled needs the intake-gate audit (#473)
       else withhold. NULL actor rejected (stale-snapshot race,
       PR #450 round 5).
     - **One reply ≠ two decisions:** if `needs-reporter-review` is also
       on the issue, that confirm does **not** clear approval.
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
       frees already-labelled issues at pickup (labels stay on). Token
       path is per-issue (#473 option 1). `intake-approval reporter`
       accepted but not honored on GitHub intake — gates like `code-org`.
     - **Bulk un-arm (#867):** `renaiss-shipflow intake clear --all` (or
       `--issue <n>`) strips `needs-reporter-approval` and posts the
       option-1 intake-gate-cleared audit as the operator. Mass-arm
       recovery without per-issue `gh issue edit`. **The loop must never
       call this** — operator-only; gh write is the authz.
     - Unreadable author association / comment list → gate that pass only,
       write **no** label.
     - **Later trusted lookup self-heals (#868):** a labelled issue whose
       live association is OWNER/MEMBER/COLLABORATOR drops the label and
       posts the intake-gate-cleared audit (`by=lookup-id`). Unreadable
       lookup still writes nothing; still-outside stays labelled.
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
   escalates — `loop-reviewer-intake.md` step 1b), validates, maps to
   features, returns an **acceptance brief** (what "done" means + features
   to regression-check). Reject (invalid/duplicate/needs a human) →
   `issue escalate <n> --category <cat> --reason "..."`, pick next. Escalate may return
   `autoResolved: true` (precedent auto-apply): a stored answer to the
   SAME question was reused — disclosure comment on the issue, no
   `needs-human`, claim KEPT; treat it like a human reply and continue;
   never re-escalate. A human `undo` reverses it (server then applies
   `needs-reporter-review`). `--owner` when the issue names one (else
   the CLI resolves `signoff-owner` → issue author).
   A merged slice that settles a decision → `issue escalate <parent>
   --update` (remaining ask only). Escalation never ends the run. **Partial-slice brief → file
   each deferred part as a follow-up sub-issue now** —
   `renaiss-shipflow issue create
   --title "…" --body "Part of #<n>: …" --json` — *before* dispatching the
   worker; bodies per the **issue-body ladder** (`message-style.md`), status
   header sourcing `Part of #<n>`.
   **Handle exit 12 on every filing** — a bare non-zero exit read as
   "failed command" silently drops the deferred scope: on **12** read
   `{blocked: true, candidates: […]}`, link the existing issue or re-file
   with **`--allow-duplicate`**; never read 12 as "filed" or "broken".
   The comparison window is `ghIssueList(repo, "open",
   DUPLICATE_SCAN_LIMIT)` — closed issues and merged PRs are never
   scored, so a restatement of a closed issue always files clean
   (defensible; a refile is often deliberate).
   **Post the brief's "Unknowns & assumptions" on the issue** via
   `renaiss-shipflow issue brief <n> --body-file <path|->` (#969) before
   dispatching — it appends `<!-- shipflow:loop -->` (never trips the
   needs-human auto-unblock) and on a re-intake EDITS the same comment,
   folding the old brief under History; never post a second brief by hand.
   A reply IS the veto (Phase A treats it as the decision).
3. **Worker — fix.** Dispatch with issue + triage + brief. It pulls the
   feature map itself (`features --json`); creates
   `.worktrees/shipflow-loop-<n>` off `origin/<default>` and works only
   there (`loop-worker.md` § Branch — **never** the shared loop worktree
   under default concurrency), fix, run project tests
   **and** a diff-scoped E2E browser pass with before/after screenshots +
   **health score** (`references/browser-testing.md`), **add a regression
   test**, open the PR via `renaiss-shipflow pr create --json --lint=strict` (full fix →
   `Closes #N`; partial slice → `Part of #N`, never a closing keyword —
   `loop-worker.md` §5), attach evidence with the health delta
   (`issue evidence <n> --pr <pr> --before … --after … --label … --caption …`).
   Returns `{pr, verified, regressionTest, healthDelta, blocked}`.
   Unverified/blocked → `issue escalate <n> --category <cat> --reason "..."`, no PR.
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
     renaiss-shipflow pr approve <pr> --scan-files <N> --scan-report <path> --scan-digest <hex> \
       --comment "<summary>"
     ```
     (adds `shipflow-approved`; refuses, exit 7, if any thread is open).
     Now `approved_ready` for A. A negative health delta
     (`references/qa-report.md`) is treated like an unresolved thread —
     no approval, no automerge, regardless of `merge-policy`.
   - **request changes** → list every fix incl. each external thread;
     re-dispatch a worker to fix + `pr resolve`, then re-review. Never
     approve with open threads. External reviewers are async — none posted
     yet → leave parked; A's next tick catches the late review. An
     immediate post-push `pr reviews` 0 is **not** settled — automerge
     owns the 120s wait + the pre-merge re-read.

No `issue done` here — the claim stays until the PR merges (A's automerge
releases it), keeping the issue out of `issue next` meanwhile.

**Judge block — keep it current (#969).** The top of every loop-touched
issue is the human's decision surface (`message-style.md` § Judge block);
the orchestrator runs `renaiss-shipflow issue judge <n>` at each state
change, never by hand:

| Moment | Command |
|---|---|
| admitted, not yet claimed (intake passed) | `issue judge <n> --state queued` — tells the reader nothing is asked of them |
| claimed (`issue work` / `issue next`) | `issue judge <n> --state working` |
| PR opened / re-pushed | `issue judge <n> --state review --pr <pr> --pr-status "CI pending"` → later `"green (CI 2/2, scan clean)"` / `"approved"` |
| parked on a dependency (`issue wait --on`) | `issue judge <n> --state blocked` — no `--blocker`: the ⏳ chain is walked to its root (`#1548 → #1544 → waits on you (…)`) |
| gate can't run (no ⏳ marker) | `issue judge <n> --state blocked --blocker "<gate> → #<owner issue>"` |
| escalated (right after the escalation posts) | `issue judge <n> --state waiting --pr <pr> --fan-out --decide "1: done → loop re-reviews" --decide "1: skip → loop parks this"` — one `--decide` per reply the footer accepts; `--fan-out` shows how many parked issues this decision unblocks |
| merged (A's automerge) | `issue judge <n> --state merged --pr <pr>` |

`--json` returns `linesToAction`; > 4 means the block is missing or a
`Decide` line is absent — fix before dispatching.

### C. Bug sweep — when there's nothing left to fix, hunt for new bugs

B exit 4 + A clean + `bug-hunt` on → load `loop-bug-sweep.md` and follow it:
test + regression + browser QA, file only REPRODUCED bugs (dedupe enforced,
exit 12), cap `bug-hunt-cap`. Filed ≥1 → back to A; nothing new → real stop.

### D. Repeat / stop

Loop A→B→C. The PASS ends at `cap` PRs-opened-this-pass, **or** empty queue
AND an empty sweep (or `bug-hunt` off), **or** the usage gate said stop
(§ "Usage gate" — that tick's only output is the `⏸ paused · usage …`
line; no ledger, since nothing was dispatched). Continuous mode: next tick
= FRESH pass, cap counter at zero — the cap never carries across ticks
(#451); a usage-paused tick re-checks the gate next tick like any other.
Report an empty queue as "queue empty", never "at cap". `cap` precedence: a
user `cap=N` token (`cap=all` drains the queue), else `SHIPFLOW_LOOP_CAP`,
else **5**. Continuous trigger (`CronCreate` / `CronList` / `CronDelete`)
→ `loop-setup.md` (run start). Blocked/escalated issues keep their claim
and `needs-human`, so `issue next` advances past them. B null **and** A
clean → C; the run ends only when C is also empty.

**Pass ledger (mandatory, every pass end — operator requirement #608):**
after the count line, print a compact table: one row per DISPATCH —
`role · target (#issue/#PR) · outcome · subagent tokens` (from each Task
return's usage metadata) — plus a totals row (dispatches, merged, tokens).
Tokens the orchestrator itself spent go in the totals line when the harness
reports them. No ledger = the pass is not done.
Include `tokensReadPerTick` in the totals row — the doc/context TOKENS this
tick loaded (spine + cards + contracts; ≈ bytes/4), so corpus creep stays
measurable (#611).

**At the cap or an empty queue:** summarize — PRs opened, merged,
parked-awaiting-review, escalated (with reasons) — then ask whether to
continue beyond the cap or raise the merge policy. Intent-gate-parked
rows: the correct copy is "N PR(s) await your confirmation token on the
PR (removing an absent `needs-reporter-review` is a no-op; token-less
override is shape-specific — `loop-gate.md`)" — never suggest a
hand-merge for a gated PR (#451); "merge by hand" only for rows the
operator can legitimately merge (e.g. policy-parked on `manual`).
Releasing escalated claims and any `pr merge`/`release` need explicit
confirmation. The "ask" applies only to a `once` run — **by default the
loop is continuous**: post the one-line summary and end the turn; a
**spawned / headless session** never asks either.

## Reconcile playbook (inbox `state` → action)

Authoritative action for each PR is `reconcile[].action` from
`renaiss-shipflow loop plan --json` — same `classifyPR` inbox uses, no
second ladder. This table is the human-readable projection of that map.

Ladder, highest first: `reporter_corrected` › `awaiting_reporter` ›
`conflict` › `ci_failing` › `changes_requested` › `review_comments` ›
`ci_pending` › `approved_ready` › `needs_review` › `stale` › `awaiting_review`.
Sidecar (not `classifyPR`): `merged_unreviewed` — recently-merged `@me`
bypasses, collected separately (#552).

`awaiting_reporter` outranks everything below it — `conflict` included —
because every route below has a worker *act on the PR*, and an unconfirmed
interpretation must not be reworked, rebased or merged until the human
answers (#411). `reporter_corrected` sits one rung above (#442): **a
correction IS the human answering**, so the *rework* is admitted — nothing
else loosens (label stays, `pr automerge` still refuses `unconfirmed
interpretation`, rebase/merge withheld, the reworked PR re-arms; silence
still parks forever).

| `state` | What it means | Action (`loop plan` token) |
|---|---|---|
| `reporter_corrected` (→ `loop-gate.md`) | still gated, and the reporter replied with a correction | `rework` per § "A reporter correction IS the human answering" — brief it as settled; the gate stays ON |
| `awaiting_reporter` (→ `loop-gate.md`) | approved + green, interpretation unconfirmed (`needs-reporter-review`) | `park` — the reporter must confirm; re-checked next tick. **Unless the row says `escalateOnce: true`** (`rework_ceiling` / `correction_unreadable` / `reporter_gate_stale`) → `escalate_once`: `issue escalate <parent> --for-pr <pr> --once-reason <escalateOnceReason>` ONCE, nothing else — **never a PR comment** |
| `ci_failing` | a check is red | `fix_ci` — fix on branch, push; escalate after `max-fix-attempts` |
| `changes_requested` | reviewer wants changes | `address_review` — pr-feedback → fix → push → reply |
| `review_comments` | unaddressed comments — **any unresolved thread counts, including the loop reviewer's own** | `address_comments` — pr-feedback (may already be handled) → fix → `pr resolve` → reply. This is the fix half of review → fix → re-review; never route open findings back to a reviewer. If the PR merged mid-fix, **do not push the closed head**: park leftovers on `fix/pr-<n>-leftover`, then file a follow-up issue **only when `$base..HEAD` is non-empty** (`$base` captured at worktree add, before any commit) — already-handled comments produce none, and an empty follow-up is pure noise. Body per the issue-body ladder, `issue create` exit 12 handled as a duplicate (link or `--allow-duplicate`), never as a failure — loop-worker.md § "Merged mid-fix" owns the full contract |
| `ci_pending` | checks running | `park` — re-check next tick |
| (automerge blocker "behind base", **and it is the only blocker**) | green+approved but the head predates the current base — CI proved code against a base that no longer exists | `sync_no_push` — worker: in `.worktrees/shipflow-loop-pr-<n>`, `pr sync <n> --no-push` (rebase), run the tests, THEN `git push --force-with-lease` — `pr sync <n>` pushes by default, and a clean textual rebase can still fail the build, so never let it push an unverified head. Merge lands next tick on the rebased head (#530). Any other blocker present (`manual` policy, red CI, open threads, unconfirmed intent) → handle/park that first; rebasing a PR the policy can't merge is churn every base advance repeats. Rebase conflicts → the `conflict` protocol. `unsatisfiable: true` → `escalate_once` |
| `approved_ready` | approved + CI green | `automerge` — `pr automerge` (parks on `manual`; automerge owns the 120s review-settle + pre-merge thread re-read — an immediate 0 is not settled). Nothing auto-files for a review that lands after that window — automerge has no post-merge filer. That case is the worker's: the next tick's `review_comments` row, and it files only when the reconcile left uncarried commits. One late review → one issue, never two |
| `needs_review` | green, unapproved, and the loop reviewer has NOT seen this head | `review` — dispatch loop-reviewer (`pr packet` → security scan → approve). At any age: a review that never ran is exactly the failure that takes hours. **Scope:** non-draft PRs linking a ShipFlow issue (`Closes #N` / `Part of #N`) only — the loop shares one login with the operator, so drafts and hand-written PRs are never auto-reviewed or auto-approved |
| `stale` | green, unapproved, aged, and the loop is out of review moves (reviewer already saw this head, or the PR is out of scope above) | `nudge` the PR; escalate if blocked on a human |
| `awaiting_review` | same as `stale`, not yet aged | `park` — ages into `stale` at `stale-pr-hours` (#439). Not "unreviewed": an unreviewed PR is `needs_review` |
| `merged_unreviewed` | merged `@me` PR that bypassed the review gate in the last `stale-pr-hours`. Post-merge label/review does not hide it | `park` — never automerge / review / rebase. `escalateOnce` → escalate the parent once, then park; older than the window drop |

## Guardrails

Cross-cutting invariants — each other rule lives in the phase that
governs it.

- **`pr automerge` is the only merge path the loop uses** — it self-gates
  on `merge-policy`; default `manual` never merges. **Never** bare
  `pr merge` or `release` without explicit human confirmation. In a
  **spawned / headless session** (OpenClaw, Hermes, cron — SKILL.md
  "Spawned / headless sessions") no human can confirm: `pr automerge` +
  `merge-policy` is the whole merge story; `release` is skipped (escalate
  if genuinely needed).
- **Production data is off-limits to the loop.** Never request, accept,
  or use a production `DATABASE_URL`, prod secrets, or prod API keys — not
  as a worker, not as an escalation option ("grant the loop prod access"
  is refused by the escalation lint). Data work runs against a
  **local DB** (the project's compose stack / seeded dev DB — `loop-worker.md`
  step 2); when none exists, `issue escalate <n> --category missing-secret
  --reason "…"` asking the human to **set one up locally**, and hand any prod write (backfill,
  seed, one-row fix) to the operator with a pasted-back result as the
  reply. A wrong write against a local DB is free; against prod it is not
  (decided 2026-09-02, renaiss-os-index #1620/#1403/#1419).
- **Orchestrator context discipline:** dispatch, don't do — compact JSON
  and one-line subagent returns only, never source files, diffs, or test
  logs (that's what lets `cap=all` run without bloat).
- **Usage gate first, every tick.** `shipflow-usage check` exit 3 ends the
  tick before anything else runs (§ "Usage gate — TICK-START, before
  everything else"). Never skip it because the queue looks small, never
  read the percentage from anywhere but the snapshot, and never lower
  `usage-max` on your own — the operator sets it.
- **Self-regulate — WTF-likelihood:** start 0%; +15% per revert, +20% fix
  touches files unrelated to its issue, +5% per fix touching >3 files,
  +10% if only `low` severity remains. **Above ~20% → stop and
  summarize** — the loop is guessing. Smarter brake than
  `max-fix-attempts` (per-PR retries only).

## Message style

All GitHub-writing contracts (readable-body, issue-body ladder, escalation
format, commit messages via `shipflow:smart-commit`) live in
`message-style.md` — load it in any dispatch that WRITES to GitHub.
