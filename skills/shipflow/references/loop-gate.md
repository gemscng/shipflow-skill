# Intent gate & reporter protocol (loop)

Split from loop-mode.md §Guardrails (#611). The spine routes here from the
`awaiting_reporter` / `reporter_corrected` / escalate-once rows — load this
card ONLY when one of those states is in play.

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

  | **Releasing the gate** | only the reporter, with a reply that is ONLY `/confirm` / `confirm` / `confirmed` / `approved` / `yes` / `lgtm` / `sgtm` / `ship it` / 👍 / `+1` and nothing else — never the loop |
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
  | **Parent escalated?** | `parentNeedsHuman: true` → use the **needs-human answer path** (`loop-mode.md` § A, human-reply rule) instead (clear `needs-human`, add `loop-proceed`, bake in, dispatch). One reply, one protocol — never both. Resolved from closing refs AND a `Part of #N` slice link, so a `--partial` PR's parent counts. |
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
