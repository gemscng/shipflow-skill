---
name: shipflow
description: Drive ShipFlow from Claude Code via the `renaiss-shipflow` CLI, which signals ShipFlow (Discord, the dashboard, teammates) and uses gh for GitHub writes. Use when the user mentions ShipFlow, or wants to check project status / what to work on, list or file issues, pick up / claim / release an issue, attach test evidence (screenshot or video) to an issue, autonomously loop through and fix issues, open or merge a PR, run tests or regression, cut a release, or sign in. Also use proactively when the user starts feature/change work that has no issue (to relate it to an open issue or open one).
---

# ShipFlow

ShipFlow is a human-in-the-loop communication layer: each command's value is
the side-effect signaled to ShipFlow (Discord, dashboard, teammates), not the
local action. Run everything via the bundled `renaiss-shipflow` CLI. The 19
shipped slash commands wrap matching CLI verbs — prefer `/shipflow-<action>`
when typed. CLI-only verbs (`init`, `priorities`, `profiles`) have no slash
wrapper; this skill still routes natural language to the same CLI calls.

## Preamble (run first)

Self-update check + ensure the bundled CLI is runnable (cached; ~no overhead):

```bash
PLUGIN_DIR=$(ls -d ~/.claude/plugins/cache/renaissshipflow/shipflow/*/ 2>/dev/null | sort -V | tail -1)
# Link the newest plugin's CLI launcher onto PATH (next to node). ALWAYS re-point
# our own symlink to the newest cached version so the CLI never strands on an old
# one; never clobber a real (non-symlink) global install.
if [ -n "$PLUGIN_DIR" ]; then
  _ND=$(dirname "$(command -v node 2>/dev/null)" 2>/dev/null)
  _cur=$(command -v renaiss-shipflow 2>/dev/null || true)
  if [ -n "$_ND" ] && { [ -z "$_cur" ] || { [ -L "$_cur" ] && readlink "$_cur" 2>/dev/null | grep -q '.claude/plugins/cache/renaissshipflow/'; }; }; then
    ln -sf "$PLUGIN_DIR/bin/renaiss-shipflow" "$_ND/renaiss-shipflow" 2>/dev/null || true
  fi
fi
[ -n "$PLUGIN_DIR" ] && "$PLUGIN_DIR/bin/shipflow-update-check" 2>/dev/null || true
```

Prints `UPGRADE_AVAILABLE` (and `SHIPFLOW_AUTO_UPDATE` is not `false`) →
`references/auto-update.md`, then continue. No output → proceed.

## Platform adaptation — non-Claude harnesses

Under OpenAI Codex CLI read `references/codex.md` FIRST; under Cursor,
`references/cursor.md` (the plugin cache resolves there — Task tool /
CronCreate still degrade). Any other harness without Claude Code's plugin
cache / Task tool / CronCreate / AskUserQuestion: start from
`references/codex.md` — it replaces the preamble above and maps every
harness-specific affordance. Commands, guardrails, and message contracts
are identical across harnesses.

## Intent → command

| If the user says... | Run |
|---|---|
| "what's my status" | `renaiss-shipflow status --json` |
| "list issues" | `renaiss-shipflow issues list --json` |
| "export issues to excel" | `renaiss-shipflow issues export` (gh-style filters; `--out <file.xlsx>`) |
| "file an issue about X" | `renaiss-shipflow issue create --title "X" --body "..."` — body: `references/loop-mode.md` § "Message style"; visible bug → `--screenshot <path...>`. **Exit 12 = duplicate, nothing created** (#580) → `references/feature-issue-detection.md` |
| ↳ who it lands on | Under `pickup-scope=assigned` (the default) it **auto-assigns the current gh login** (#673) — assignment is the queueing gesture, so an unassigned filing is invisible to `issue next`. `--assignee <login...>` overrides; **`--no-assign`** files it unassigned so the loop does NOT pick it up |
| feature work with no issue / PR without `Fixes #N` | → `references/feature-issue-detection.md` |
| "auto-create issues" | `renaiss-shipflow config set auto-issue true` |
| "pick up #42" | `renaiss-shipflow issue work 42 --json` |
| "what should I work on" | `renaiss-shipflow issue next --json` |
| "what needs follow-up on my PRs" | `renaiss-shipflow inbox --json` |
| "feature map" / "what features exist" | `renaiss-shipflow features --json` |
| "standing priorities" | `renaiss-shipflow priorities --json` (human-edited `docs/PRIORITIES.md`) |
| "loop through issues and fix them" / `/shipflow-loop` | Loop mode → `references/loop-mode.md` |
| "escalate #42 to a human" | `renaiss-shipflow issue escalate 42 --reason "..." --category <cat>` — categories, `--update`, and the `--for-pr`/`--once-reason` once-key: `references/loop-mode.md` |
| "set the default sign-off owner" | `renaiss-shipflow config set signoff-owner <github-login>` |
| "unmatched commit email" | `renaiss-shipflow git-identity --fix` |
| "I'm done with #42" | `renaiss-shipflow issue done 42` |
| "attach test evidence to #42" | `renaiss-shipflow issue evidence 42 --pr <pr> --before … --after … --label … --caption …` — one labeled pair per changed surface; `--file` video-only; bug w/o fix → `--actual` |
| "open a PR" | `renaiss-shipflow pr create --json --lint=strict` (after committing) |
| "is PR 87 mergeable" | `renaiss-shipflow pr ready 87 --json` |
| "open review threads on 87" | `renaiss-shipflow pr reviews 87 --json` (read-only query like `pr ready`; parse `blocking`/`unresolvedThreads` — rc is not the signal) |
| "resolve the threads I fixed" | `renaiss-shipflow pr resolve 87 --thread <id>` |
| "capture PR 87's diff for a scan" | `renaiss-shipflow pr diff 87 --out /tmp/pr-87.patch` (GitHub's bytes, never local git; exit 9 = empty capture) |
| "approve PR 87" (reviewer verdict) | `renaiss-shipflow pr approve 87 --comment "..." --scan-files <N> --scan-report <path> --scan-digest <sha256>` (exit 7 = open threads; exit 9 = bad scan attestation) |
| "auto-merge if ready" (loop) | `renaiss-shipflow pr automerge 87 --json` (self-gates on `merge-policy`) |
| "rebase PR 87" | `renaiss-shipflow pr sync 87` (aborts cleanly on conflict) |
| "fix the merge conflict" | `renaiss-shipflow pr sync 87 --keep-conflicts` → `references/conflict-resolution.md` |
| "did I leave conflict markers?" (before any push) | `renaiss-shipflow pr conflict-check --base origin/<base>` (exit 8) — always name the base: after `rebase --continue` commits the markers, a base-less check exits 0 |
| "merge PR 87" (explicit, human-confirmed) | `renaiss-shipflow pr merge 87` (squash; deletes the remote branch — clean up the local worktree/branch after, `-D` since squash looks "unmerged") |
| "set merge/CI/WIP policy" | `renaiss-shipflow config set merge-policy auto-on-green` (see `config list`) |
| "run tests" | `renaiss-shipflow test` |
| "run regression" | `renaiss-shipflow regression --json` |
| "cut a release" | `renaiss-shipflow release --tag vX.Y.Z --json` |
| "sign in" | `renaiss-shipflow login` |
| "link this repo" | `renaiss-shipflow init` |
| "list config profiles" | `renaiss-shipflow profiles` — switch with `--profile <name>` or `SHIPFLOW_PROFILE` |

## Output handling

- Pass `--json` whenever supported and parse it; never regex-scrape prose.
- Present results graphical-first: one-line verdict, then table / checklist /
  meter — contract: `references/loop-mode.md` § "Message style".
- Show the `triage` payload from `issue work` verbatim.
- A failed signal POST (stderr warning) still means the GitHub-side action
  succeeded; mention it, don't retry.

## Guardrails

- No auto-branching on `issue work`; no auto-written plan files, commit
  messages, or other local files from its output — show the context and ask.
- Never `release` or `pr merge` without explicit user confirmation (both are
  team-visible). Spawned/headless (below): they simply don't run —
  `merge-policy` governs merges via `pr automerge`, `release` is skipped.
  Absence of a human is never approval.

Loop mode (explicit opt-in, below) deliberately overrides these guardrails.

## Spawned / headless sessions (OpenClaw, Hermes, cron)

ShipFlow runs unattended. In a session spawned by an AI orchestrator
(OpenClaw/Hermes via ACP) or a headless scheduler, no human can answer a
prompt. Detect it at the start of the run:

```bash
# OpenClaw sets $OPENCLAW_SESSION; $CI covers CI/cron; $SHIPFLOW_HEADLESS is an
# explicit opt-in for any other headless spawner (e.g. Hermes). Deliberately NOT
# a TTY check (`[ -t 0 ]`): Claude Code's Bash runs non-interactively even when a
# human is driving, so a TTY test false-positives and would wrongly drop the
# human-confirmation gates.
[ -n "$OPENCLAW_SESSION$CI$SHIPFLOW_HEADLESS" ] && echo "SPAWNED_SESSION: true"
```

Treat any known headless / cron / CI invocation the same. In a spawned session:

- **Never block for confirmation.** The policy knobs (`merge-policy`,
  `require-ci`, `require-review`, `wip-limit`) are the only authority.
  `manual` **parks** approved PRs; bare `pr merge` / `release` don't happen.
- **Never `AskUserQuestion` / wait for input.** Proceed per policy, or
  `renaiss-shipflow issue escalate <n> --reason "..."` (labels `needs-human`)
  and keep going — **escalate, don't pause**.
- **Report, don't ask**: end each pass with `✅ N merged · 🔀 N opened ·
  ⏸ N parked · 🚧 N escalated` plus a short table of decisions.

Same posture as Loop mode's continuous default, made mandatory.

## Loop mode

Only when the user explicitly asks to loop through and fix issues autonomously
(or `/shipflow-loop`): read `references/loop-mode.md` and follow it — a thin
orchestrator dispatching each item to fresh-context subagents, governed by the
policy knobs in `config list`. Load `loop-setup.md` once per run (tick 0 /
before the cycle), not every tick. Everything else stays a single command from
the table above. Companions: `loop-setup.md` (run start), `loop-worker.md` /
`loop-reviewer.md` (role contracts), `browser-testing.md`, `bug-taxonomy.md`,
`qa-report.md`, `pr-feedback.md`, `conflict-resolution.md`.

## First run

Any command exits non-zero with "Not signed in." until `renaiss-shipflow login`
runs once per machine (drives `gh auth`; caches a ShipFlow JWT in
`~/.config/renaissshipflow/credentials.json`).
