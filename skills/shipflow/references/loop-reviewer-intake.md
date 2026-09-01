# Loop reviewer subagent — Mode 1: issue intake

The issue-intake half of the mandatory gate (`require-review`, default on):
**every issue passes the reviewer at intake.** The PR gate (Mode 2), the
degradation discipline, self-verify, and the Return contract live in
`loop-reviewer.md`.

## Always start by pulling the system map
(shared preamble — canonical in loop-reviewer.md)
```bash
renaiss-shipflow features --json
```
Feature → `name`, `description`, `category`, `layer`, `paths`,
`test_priority`. Locate the touched feature(s) and the **neighbouring**
features sharing paths/layers (the regression risk).

## Mode 1 — issue intake (before any worker touches it)
Input: issue + `triage`. Produce an **acceptance brief**:
0. **Human override? — check first.** `loop-proceed` label, or a human
   "proceed / go ahead / just work on it" comment after a loop escalation =
   green-lit: skip the validity-reject; never re-`reject` a `loop-proceed`
   issue. Go straight to feature mapping + a brief for the smallest sensible
   slice. Sticky across re-picks (`loop-mode.md`, human-reply rule). A
   structured `N: answer` reply to the escalation's numbered decisions is
   equally a proceed override: answered decisions are settled — don't re-ask;
   skip the validity-reject.
1. **Valid? — `reject` only for a hard blocker** (it escalates to
   `needs-human`): missing secrets/credentials or external setup; a
   security-/trust-critical surface needing human validation; an absent
   spec/design doc; a hard dependency on an unmerged issue; a genuine
   duplicate/invalid issue. Otherwise proceed.

   **The escalate `--reason` IS the comment a human reads — act-on-able,
   not a wall of text.** Shape is `lintEscalationReason`
   (`apps/renaissshipflow-cli/src/escalation-format.ts`) — fix a rejected
   reason; `--force` is for humans, not the loop. Process: `--category`
   (`money-write`, `prod-config`, `security`, `missing-secret`,
   `external-dependency`, `invalid`); `--owner <login>` when the issue
   names someone, else the CLI resolves `signoff-owner` → issue author.
   Re-escalating: `--update` edits the 🚧 comment in place; shrink to what
   remains open, mark settled "resolved by #N". One live escalation per
   issue.
1b. **Product priority — check before any "worth building now?" escalation.**
   `renaiss-shipflow priorities --json` parses `docs/PRIORITIES.md` (owner's
   ordered work-class greenlist + WIP share). Human-edited ONLY — the loop
   never writes it; propose changes via escalation. Owner's intake rule
   (#211), verbatim:

   > "Loop may auto-proceed on greenlit classes for normal slices; NEVER for
   > deploy-blast-radius work (revert/release/config paths — the #218 lesson)
   > which always needs per-item sign-off; off-doc work escalates as today."

   - Greenlit class + normal slice → no sign-off escalation; record
     `priorities: class <rank> — <name>` in the brief.
   - Deploy-blast-radius (reverts, releases, deployment/config paths) →
     per-item human sign-off ALWAYS, even when greenlit.
   - Off-doc (no class match, `found: false`, or a parse `warning`) →
     escalate for sign-off as before.
   The doc settles product priority only — other step-1 hard blockers still
   escalate. WIP share steers the admit mix, not a per-issue gate.
2. **Too big or ambiguous? — scope down, don't refuse.** Large / open-ended /
   ambiguous / contradictory is NOT grounds to escalate. Carve the smallest
   bounded, value-adding slice you can confidently accept; brief that slice.
   Return deferred parts in your payload as follow-up sub-issues (the
   orchestrator files them at admit time — `loop-mode.md`, Phase B step 2).
   Mark a sliced brief partial — its PR links `Part of #N`, never a closing
   keyword (`loop-worker.md` §5). `reject` only when no safe value-adding
   slice exists.
3. **Feature mapping** — feature(s) touched (path overlap with
   `triage.relatedFiles` + description); note cross-feature blast radius.
4. **Acceptance criteria** — what "done" means + which features to
   regression-check.
4b. **Authz / gating issues need a WHO-SEES-WHAT table — don't admit without
   one.** Access control / permissions / visibility / roles / tenancy / any
   gating without who-sees-what criteria: generate the table yourself — one
   row per (role / auth state / tenant → allowed? · sees what) — and get
   reporter confirmation via the `N: answer` reply. Unconfirmed = `security`
   blocker: no worker until the audience is pinned — a guessed access boundary
   leaks data (intake counterpart of the automerge interpretation gate,
   `loop-worker.md` §5d). Brief only after confirmation (or `loop-proceed`).
5. **Unknowns & assumptions (blind-spot pass) — mandatory section.** Every
   open ambiguity + the assumption chosen; flag those that would change the
   architecture. A listed assumption costs one veto reply; a silent one is
   invisible until expensive. The orchestrator posts it on the issue
   (`loop-mode.md`). Shape (#958): a table `| # | Unknown | Assumption |`
   (or ≤6 bullets), then ONE closing line naming the veto path — not a
   second copy of the brief. **On re-intake, supersede — never stack:** a
   fresh assumptions comment must open `Supersedes the <date> intake
   comment.` so the reader knows exactly one is live (issue #921 collected
   two competing assumption sets with no ordering cue).
6. **Uncertainty first, references over descriptions.** Lead with the most
   likely wrong (data-model changes, new type interfaces, user-facing
   behavior); routine refactoring last. When target behavior exists in code
   (this repo, sibling, vendored), cite the path — code carries semantics
   prose loses.

## Return

Intake returns the same compact shape as the PR gate — see `loop-reviewer.md`
§ "Return (compact)" (`target: "issue:<n>"`, `verdict`, `featuresImpacted`,
`brief`). Triage unavailable (`⚠️ triage unavailable — ShipFlow context and
relatedFiles NOT loaded`) blocks like any un-run gate — rule and marker table
in `loop-reviewer.md` § "Degradation discipline". Message style for every
GitHub write: `message-style.md`.
