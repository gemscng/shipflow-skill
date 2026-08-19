# Phase C — bug sweep (queue empty)

Split from loop-mode.md §The cycle (#611). Load ONLY when Phase B exits 4
with Phase A clean.

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
   (`bug-taxonomy.md` §3; body = the **issue-body ladder**,
   `message-style.md` — status header sourcing `auto-qa sweep`). Attach evidence
   (`issue evidence <n> --file <shot>`), update the baseline. **Only file
   what you reproduced.**

   **Sweep filings land assigned, on purpose (#673).** Under
   `pickup-scope=assigned` (the default) `issue create` auto-assigns the
   current gh login, because an unassigned filing is invisible to `issue
   next` forever — that is what made #656/#657 dead letters. Don't pass
   `--no-assign` on a sweep filing: it is the opt-out for a HUMAN filing
   something the loop should not pick up. If `gh` rejects the login on the
   target repo, the filing survives **unassigned** with a warning — assign
   it by hand or it stays out of the queue.

   **Near-verbatim duplicate filing is blocked in code (#580) — but the
   check is narrow, so keep searching.** `issue create` scans
   `ghIssueList(repo, "open", DUPLICATE_SCAN_LIMIT)` (`--limit 1000`) and
   refuses only a near-verbatim restatement. Closed issues and merged PRs
   are never scored, so a restatement of a closed issue always files
   clean (defensible; a refile is often deliberate). A **paraphrase slips
   through** (#404 vs #569, ~0.38) — still keyword-search before filing.
   `renaiss-shipflow issues list --json` defaults to the same 1000-issue
   window as the pre-flight and sets `truncated: true` when that window
   is FULL — do not treat a full page as the whole corpus (#582; the
   old default `--limit 30` is how #579 restated #427).

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
   | #579's title + ` (#427 regression)` | **refused** at 0.824 — gate 5 drops `427`; public `similarity()` stays 0.778 | `427` still discriminates in full |
   | #579's title + ` (#999 regression)` | files clean — `999` still discriminates | `999` still discriminates |
   | `owner/repo#427` anywhere in the title | files clean — a cross-repo ref is not a citation | unchanged |
   | `427` used bare *and* cited (`retried 427 times, see #427`) | files clean — one bare use is enough | unchanged |
   | 1-token + `(#N)` / `(#N-suffix)` / `(#0N)` | **refused** at 1.000 — C3 equality + gate-5 drop (#588) | the other number still discriminates |
   | 1-token + `(#N extra)` (`登录失败 (#7 regression)`) | files clean — extra words stay; C3 equality fails. Accepted residual (#588) | unchanged |

   **A citation of the issue you are restating no longer excuses you; a
   citation of any OTHER issue still does** (measured, #587; dropping every
   cited number is deliberately NOT the rule — #590). **#588:** a 1-token
   title plus `(#N)` sat at Dice 0.667 and filed clean; gate 5 now scores
   the same minus-set C3 already shares, so that pair refuses. Extra
   non-citation parenthetical words (`(#7 regression)`) still miss — residual,
   not phrase-stripped.

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

