# Running the ShipFlow skill under Cursor

The `renaiss-shipflow` CLI is a plain Node binary and every command file in
this skill is harness-neutral; only the HARNESS differs on Cursor — no
Task-tool subagents, no CronCreate, no Claude plugin namespace. Unlike Codex,
Cursor CAN resolve this skill from Claude Code's plugin cache and has a native
ask-question UI, so the gap is narrower. Read this adaptation map once at
session start, then use the skill normally.

## Setup (plugin cache usually just works)

Cursor resolves `/shipflow-loop` and the skill files from Claude Code's plugin
cache (`~/.claude/plugins/cache/renaissshipflow/shipflow/<version>/`) when
Claude Code is installed on the same machine — observed live, no bootstrap
needed. Two caveats:

- **Staleness:** the cache only refreshes when Claude Code itself updates the
  plugin. Cursor never triggers that. Check the cached `<version>` against the
  repo's latest tag at session start; if Claude Code isn't installed or the
  cache lags, fall back to the Codex clone (`references/codex.md` § Setup):
  `git clone … ~/.shipflow-skill` + symlink, updated with `git pull --ff-only`.
- `gh` must be authenticated (`gh auth status`); `renaiss-shipflow login` is
  identical on every harness.

## Harness affordance map

| Claude Code | Cursor equivalent |
|---|---|
| `AskUserQuestion` tool | Cursor's native AskQuestion tool — direct mapping, same option/label shape. Headless (`cursor-agent -p` / scheduled ticks): NEVER wait — proceed per policy or `renaiss-shipflow issue escalate`; set `SHIPFLOW_HEADLESS=1` |
| Task-tool subagents (loop worker/reviewer roles) | Honor default `loop-concurrency` **3** when this harness can dispatch parallel background agents (Cursor Task, cloud agents, or equivalent): one worker/reviewer per dispatch, each in its own `.worktrees/shipflow-loop-<issue>` (fix) or `.worktrees/shipflow-loop-pr-<n>` (reconcile). Inline `concurrency=1` / `cap=1` is the fallback **only** when you truly cannot fan out (no Task tool, no cloud agents). Keep each role's contract file open in that agent (`loop-worker.md`, `loop-reviewer.md`). |
| Skill tool → `shipflow:smart-commit` (every loop commit) | No plugin namespace: read and follow `skills/smart-commit/SKILL.md` from the SAME resolved skill root you're running (plugin cache dir, else the clone) and execute its plan (same loop adaptations: no AI-attribution trailer, skip the human-confirm gate). Never a bare `smart-commit`, never the loop worktree's copy |
| `CronCreate` continuous loop | No in-session scheduler: run a single `once` pass now, and for continuity an EXTERNAL scheduler (cron/launchd/CI) re-invokes one `once` pass per tick — interactively `/shipflow-loop once`, headless `cursor-agent -p "$(cat <skill root>/commands/shipflow-loop.md) once"`. Never leave a session "running continuously"; one loop per gh identity still applies |
| `EnterWorktree` | `git worktree add .worktrees/shipflow-loop -b shipflow-loop/base origin/<default>` (the loop-mode fallback path — harness-neutral) |
| `Read` tool on screenshots (evidence step) | Verify the PNGs exist and are non-empty (`file`, byte size); attach with `renaiss-shipflow issue evidence` exactly as documented. Drag the image into Cursor chat when visual judgment is needed |
| `claude-in-chrome` MCP browser | Not needed — `browser-testing.md` drives the gstack `browse` CLI, harness-neutral |
| Plugin auto-update hook | Cache path: run/update Claude Code to refresh, or switch to the clone + `git pull --ff-only` at session start |

## Unchanged on every harness

- Every `renaiss-shipflow` command, flag, and exit-code contract.
- The Message style contract (`loop-mode.md` § "Message style") —
  graphical-first tables/mermaid/checklists/meters.
- Escalation lint rules, evidence pair rules, the PR-body template, the
  issue-body ladder.
- Guardrails: never bare `pr merge`/`release` without explicit human
  confirmation; `merge-policy` governs automerge.

## Known degradations (accept, don't fight)

- No parallel agents at all → then (and only then) `cap=1` / `concurrency=1`
  and more frequent external ticks. If Task or cloud agents can finish a
  role unattended, keep the default 3 — do not collapse the pass.
- No session-scoped cron → dormancy between ticks lives in the external
  scheduler; the in-session answer to "how do I schedule this?" is always
  "you don't — run `once`".
- Skill version tracks Claude Code's plugin cache, not this repo → check the
  cached version at session start (Setup above) or use the clone.
