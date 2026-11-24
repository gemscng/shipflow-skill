---
name: shipflow-evidence
description: "Attach test evidence (screenshot/video) to a ShipFlow issue"
---

Run the ShipFlow CLI from this plugin. Its entry point is `../../cli/dist/renaiss-shipflow.mjs` relative to this skill directory. Run Node with that absolute path from the user's current project. Use the arguments from this invocation. For host-specific setup and loop behavior, see `../shipflow/references/antigravity.md`.

Attach testing evidence for issue $ARGUMENTS — screenshots must show the fix's
effect as **before/after pairs, one per changed surface** (not one pair total):

```bash
renaiss-shipflow issue evidence <number> [--pr <pr>] \
  --before <surface1-before.png> <surface2-before.png> \
  --after  <surface1-after.png>  <surface2-after.png> \
  --label  "Surface 1" "Surface 2" \
  --before-caption "what surface 1 shows before" "what surface 2 shows before" \
  --after-caption  "what surface 1 shows after"  "what surface 2 shows after" \
  --caption "one-line summary of what was verified"
```

Pair/mix: `validateEvidenceSelection`
(`apps/renaissshipflow-cli/src/evidence.ts`).
**One claim per image**: a caption asserts only what its own image shows — if it
needs "and" or lists surfaces/viewports, split into more labeled pairs.
**Mark the change without covering it**: before each after-shot, outline the changed
element (`outline: 3px solid #ff3b30; outline-offset: 3px` via your browser tool's
JS eval) — the outline surrounds the change; never overlay content with boxes/arrows.
A defect capture (`--actual`, no fix yet) outlines the broken element the same way.
Not a live page (composite, simulator/native shot, `--image` mock, terminal output)?
Draw the outline onto the image: `references/browser-testing.md` § "Mark what changed".
`--pr` lands the comment on the PR for reviewers. Capture flow (headed browser,
per-surface loop): `references/browser-testing.md` §4.
**Auth-walled UI — never ask the user to sign in**: if `localhost` or a preview URL
redirects to `/login` and no session cookies exist, render the real branch UI locally
in dev mode with fake/fixture data (built-in dev/mock auth or fixtures first, else
network stubbing, else a temporary local-only dev stub or preview route — revert and
verify `git status`/`git diff` clean before committing so zero auth bypasses enter the
PR). Note `local dev · fixture data` in the caption; never skip screenshots or emit
`⚠ no screenshot` for an auth wall (`references/browser-testing.md` §3).
**No UI surface** (schema, persistence, API-only, test-only)? Skip the pairs and
attach the test-runner summary: `--file <issue>-vitest.txt --caption "Verified: …"`.
The server renders the text inline; a pass/fail line in the PR body alone is not evidence.
**API changes and public exposure** (#1489): with `--pr`, the command reads
the PR diff and attaches `api-changes.diff`. It lists the routes added (`+`) and
removed (`-`), and `! check:` lines for added secrets, email addresses and
personal-data fields in API code (kind and `file:line`, never the value). Add
what detection missed with `--api-change "+ GET /api/v1/items" "- field email in
GET /users"`. State the sensitive data the change makes public, and to whom,
with `--exposure "none"` or `--exposure "<what, to whom>"`: the command warns
when routes changed and it is missing. Text files (`--file`) are uploaded to a
public bucket, so secrets and personal email addresses in them are redacted
first. `--no-api-scan` skips the diff scan. Nothing here blocks the upload.
**Upload fails** (`API error 5xx` or `fetch failed`): add
`⚠ no screenshot — evidence upload failed: <error> (<request id>)` to the PR's
Testing list and re-run the same command once the API answers. Never push the
shots to an `evidence/*` side branch, commit them to a repo, or use another image
host. A usage error (bad flag, file over 8 MB): fix it and re-run.
Details: `references/browser-testing.md` §6.
