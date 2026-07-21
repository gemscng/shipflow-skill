# Browser end-to-end testing (the loop's E2E verify step)

How the loop verifies a fix in a real browser and captures screenshot evidence,
before opening a PR. Modeled on gstack's `browse` + `/qa` flow. For UI/behavior
changes this is the **required** verification; pure backend/library changes can
verify with the project's own tests instead (but still capture relevant output).

## 1. Resolve + ensure a healthy browser

ShipFlow drives the **gstack headed browser** (`browse`). Resolve *and* health-check
it in one step:

```bash
BROWSE="$("$PLUGIN_DIR/bin/shipflow-browser" --ensure)" || { echo "$BROWSE" >&2; exit 1; }
```

`--ensure` resolves gstack `browse` **and heals a wedged server** — the
"Auth failed — server may have restarted" / stale-port state that `browse restart`
can't recover on its own. It kills the stale server + its chromium so the next
command respawns fresh; the chromium profile (cookies, auth, scroll) persists on
disk, so nothing is lost. If gstack isn't installed, fall back to the project's own
E2E runner (Playwright/Cypress) and still produce a screenshot — never skip visual
verification for a UI change.

## 2. Scope the test from the branch diff

Before driving the browser, work out **what to test** from what changed — don't
just verify the one line you edited. Map the diff to the pages it affects:

```bash
git diff origin/<default>...HEAD --name-only
git log origin/<default>..HEAD --oneline
```

- route/controller files → the URL paths they serve
- view/template/component files → the pages that render them
- model/service files → the pages whose features use them (cross-ref the feature
  map: `renaiss-shipflow features --json` gives each feature's `paths`)
- **adjacent pages** — features that **share paths** with the changed ones are the
  regression risk; test those too (this is what catches a fix breaking a neighbour)
- API/backend-only change → exercise it (`$BROWSE js "await fetch('/api/...')"`) and
  still load the main flow — backend changes affect app behavior

The set of affected + adjacent pages is your test plan for step 3. If the diff maps
to no page, fall back to a smoke pass of the homepage + top nav.

## 3. Get the app under test running

- The browser is already healthy (step 1 ensured it) — **reuse** the session, don't
  relaunch.
- Point it at the **running app** and its URL: a local dev server (start it if
  needed, e.g. `npm run dev`), the PR's `--preview-url`, or production. Use the page
  the issue is about.
- For auth-walled pages, import cookies once:
  `$BROWSE cookie-import-browser chrome --domain <domain>` (a one-time macOS
  Keychain prompt the user approves).

## 4. Drive the fix end-to-end (before → after, one pair PER changed surface)

**One before/after pair per surface or state the fix touches — not one pair
total.** A change that restyles a mode row, a button, and a status chip needs
three pairs; a single pair proves one surface and leaves the rest unverified.
List the affected surfaces from the issue/PR first, then loop:

```bash
EV="${TMPDIR:-/tmp}/shipflow-evidence/issue-<n>"; mkdir -p "$EV"
# For EACH affected surface/state (name the files after it):
$BROWSE goto <url>
$BROWSE snapshot -i                          # interactive elements → @e1, @e2 refs
$BROWSE screenshot "$EV/<surface>-before.png" # state before exercising the fix
# Reproduce the issue's scenario using refs from the snapshot:
$BROWSE click @e3
$BROWSE fill @e4 "value"
$BROWSE press Enter
$BROWSE snapshot -D                          # DIFF — proves what changed, the heart of the check
$BROWSE console --errors                     # no new console errors introduced
$BROWSE screenshot "$EV/<surface>-after.png" # the fix working
```

- The `snapshot -D` diff is the verification — it shows the DOM actually changed
  the way the fix intends (e.g. the error banner is gone, the row was deleted).
- A surface only reachable after another interaction (a result card, an open
  overlay) is still a surface — drive to it and capture its pair.
- Optionally check layout: `$BROWSE responsive "$EV/layout"` (mobile/tablet/desktop).

## 5. Make the screenshots visible, score, then gate

- **Read** each PNG with the Read tool (`$EV/after.png`, etc.) so you and the user
  actually see the result — an unread screenshot is invisible.
- **Score the affected page(s)** with the health rubric in `references/qa-report.md`
  (0–100, weighted). Compute it for the page **before** and **after** the fix so you
  have a delta. Re-score **adjacent** pages too — a neighbour whose score dropped
  means the fix regressed it (revert/fix before opening the PR, never ship it).
- **Pass/fail gate:** only continue to evidence + PR if the fix genuinely
  verified (expected change present, no new console errors, **no negative score
  delta on a neighbour**). If it didn't, go back and fix, or release the issue as
  blocked — do **not** open a PR for an unverified fix.

## 6. Hand the evidence to the PR

Once the PR is open, attach the captured screenshot(s) **to the PR** so reviewers
see the verification inline — pass the PR number with `--pr`, and put the health
delta in the caption (the reviewer and merge gate read it):

```bash
renaiss-shipflow issue evidence <n> --pr <pr> \
  --before "$EV/mode-row-before.png" "$EV/ladder-before.png" \
  --after  "$EV/mode-row-after.png"  "$EV/ladder-after.png" \
  --label  "Mode row" "Grade ladder" \
  --caption "Verified: <what you tested> · health <before>→<after> (Δ<+/-N>) · 0 new console errors"
```

Screenshot evidence **must** include both `--before` and `--after`, with equal
counts — `before[i]` pairs with `after[i]`, and `--label` names each pair by
position. Multiple (or labeled) pairs render as a side-by-side
`| Surface | 🔴 Before | 🟢 After |` table the reviewer judges row by row; a
single unlabeled pair renders under stacked "Before/After the fix" headings.
The command rejects a lone before or after and mismatched pair counts. With `--pr`, the comment lands on the PR (plus
the reporter's chat thread); the issue stays linked through the PR's `Fixes #<n>`.
Without a PR, it falls back to an issue comment. Attach a short screen recording
as well for flows that need motion (`--file demo.mp4`).
