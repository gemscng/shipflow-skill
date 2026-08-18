# Browser end-to-end testing (the loop's E2E verify step)

How the loop verifies a fix in a real browser and captures screenshot evidence
before opening a PR. **Required** for UI/behavior changes; backend/library-only
changes may verify with the project's own tests (still capture relevant output).

## 1. Resolve + ensure a healthy browser

ShipFlow drives the **gstack headed browser** (`browse`). Resolve *and*
health-check in one step:

```bash
BROWSE="$("$PLUGIN_DIR/bin/shipflow-browser" --ensure)" || { echo "$BROWSE" >&2; exit 1; }
```

`--ensure` resolves gstack `browse` **and heals a wedged server** (stale port /
"Auth failed — server may have restarted"); the chromium profile (cookies,
auth) persists on disk. No gstack → fall back to the project's E2E runner
(Playwright/Cypress) and still produce a screenshot — never skip visual
verification for a UI change.

## 2. Scope the test from the branch diff

Map the diff to the pages it affects — don't just verify the one line you
edited:

```bash
git diff origin/<default>...HEAD --name-only
git log origin/<default>..HEAD --oneline
```

- route/controller files → the URL paths they serve
- view/template/component files → the pages that render them
- model/service files → pages whose features use them
  (`renaiss-shipflow features --json` → each feature's `paths`)
- **adjacent pages** — features sharing paths with the changed ones are the
  regression risk; test them too
- API/backend-only change → exercise it (`$BROWSE js "await fetch('/api/...')"`)
  and still load the main flow

Affected + adjacent pages = the step-3 test plan. No page mapped → smoke-pass
the homepage + top nav.

## 3. Get the app under test running

- The browser is already healthy (step 1) — **reuse** the session, don't
  relaunch.
- Point it at the **running app** (local dev server, the PR's `--preview-url`,
  or production), at the page the issue is about.
  **Starting a dev server: DETACH it, never foreground** (#490) — a foreground
  `npm run dev` blocks the whole tool call. Also (#491): isolate per run (a
  shared PID file/port makes parallel workers kill each other's servers), kill
  the PROCESS TREE, and ABORT when readiness never comes:
  ```bash
  RUN_DIR=$(mktemp -d)
  # Reserve a FREE port — a colliding draw makes the probe "ready" against the wrong app (#492).
  PORT=$((3100 + RANDOM % 900))
  while lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((3100 + RANDOM % 900)); done
  ( PORT=$PORT nohup npm run dev > "$RUN_DIR/dev.log" 2>&1 & echo $! > "$RUN_DIR/dev.pid" )
  # Teardown takes the whole DESCENDANT tree — the saved PID is the npm
  # wrapper; `pkill -P` misses grandchildren reparented to PID 1.
  kill_tree() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done; kill "$1" 2>/dev/null; }
  READY=
  for i in $(seq 1 30); do
    curl -fsS -o /dev/null "http://localhost:$PORT" && { READY=1; break; }
    sleep 2
  done
  if [ -z "$READY" ]; then
    tail -40 "$RUN_DIR/dev.log"           # the finding IS the failed startup
    kill_tree "$(cat "$RUN_DIR/dev.pid")"
    exit 1                                 # HARD STOP — never fall through into browser steps
  fi
  # … drive the browser against http://localhost:$PORT …
  kill_tree "$(cat "$RUN_DIR/dev.pid")"
  ```
- Auth-walled pages: `$BROWSE cookie-import-browser chrome --domain <domain>`
  (one-time macOS Keychain prompt).

## 4. Drive the fix end-to-end (before → after, one pair PER changed surface)

**One before/after pair per surface or state the fix touches — not one pair
total.** List the affected surfaces from the issue/PR, then loop:

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
# Outline AROUND the changed element — never an overlay/arrow ACROSS it:
$BROWSE js 'document.querySelectorAll("<changed-el-selector>").forEach(e=>{e.style.outline="3px solid #ff3b30";e.style.outlineOffset="3px"})'
$BROWSE screenshot "$EV/<surface>-after.png" # the fix working, change outlined
```

- The `snapshot -D` diff IS the verification — the DOM changed the way the fix
  intends.
- A surface only reachable via interaction (a result card, an open overlay) is
  still a surface — drive to it and capture its pair.
- Optional layout check: `$BROWSE responsive "$EV/layout"` (mobile/tablet/desktop).

## 5. Make the screenshots visible, score, then gate

- **Read** each PNG with the Read tool — an unread screenshot is invisible.
- **Score the affected page(s)** with the rubric in `references/qa-report.md`
  (0–100, weighted), **before** and **after**, for a delta. Re-score
  **adjacent** pages — a dropped neighbour = the fix regressed it (revert/fix
  before the PR, never ship it).
- **Pass/fail gate:** proceed to evidence + PR only if genuinely verified
  (expected change present, no new console errors, **no negative neighbour
  delta**). Otherwise fix, or release the issue as blocked — never open a PR
  for an unverified fix.

## 6. Hand the evidence to the PR

Once the PR is open, attach the screenshot(s) **to the PR** with `--pr`, health
delta in the caption (the reviewer and merge gate read it):

```bash
renaiss-shipflow issue evidence <n> --pr <pr> \
  --before "$EV/mode-row-before.png" "$EV/ladder-before.png" \
  --after  "$EV/mode-row-after.png"  "$EV/ladder-after.png" \
  --label  "Mode row" "Grade ladder" \
  --caption "Verified: <what you tested> · health <before>→<after> (Δ<+/-N>) · 0 new console errors"
```

Pair/mix: `validateEvidenceSelection`
(`apps/renaissshipflow-cli/src/evidence.ts`). `--pr` lands the comment on
the PR (plus the reporter's chat thread; issue linked via `Fixes #<n>`);
without it, an issue comment. `--file demo.mp4` adds a screen recording for
flows that need motion.
