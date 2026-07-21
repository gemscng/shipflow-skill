# Running the ShipFlow skill under OpenAI Codex CLI

The `renaiss-shipflow` CLI is a plain Node binary and every command file in
this skill is harness-neutral ("Run `renaiss-shipflow … --json`, render a
table"). What differs on Codex is the HARNESS: no Claude Code plugin cache, no
Task-tool subagents, no CronCreate, no AskUserQuestion. This file is the
adaptation map — read it once at session start, then use the skill normally.

## Setup (replaces the Claude-Code preamble)

The SKILL.md preamble resolves the CLI from `~/.claude/plugins/cache/…` — that
path does not exist on Codex. Instead (see `codex/README.md` in the published
plugin repo for the one-time install):

```bash
# The plugin repo cloned to a stable path, CLI on PATH:
git clone https://github.com/gemscng/shipflow-skill ~/.shipflow-skill
ln -sf ~/.shipflow-skill/bin/renaiss-shipflow ~/.local/bin/renaiss-shipflow
renaiss-shipflow --version   # sanity: bundled CLI runs under node >= 20
```

`gh` must be authenticated (`gh auth status`); ShipFlow auth via
`renaiss-shipflow login` is identical on every harness.

## Harness affordance map

| Claude Code | Codex CLI equivalent |
|---|---|
| `AskUserQuestion` tool | Interactive session: ask in plain text and wait. Headless (`codex exec`): NEVER wait — proceed per policy or `renaiss-shipflow issue escalate` (the spawned-session contract in SKILL.md applies as-is; set `SHIPFLOW_HEADLESS=1`) |
| Task-tool subagents (loop worker/reviewer roles) | Run the roles INLINE, sequentially, in this one context: intake-review the issue, then work it, then self-review before `pr approve`. Keep each role's contract file open while in that role (`loop-worker.md`, `loop-reviewer.md`). Context hygiene substitute: work ONE issue per invocation, `cap=1` |
| `CronCreate` continuous loop | No in-session scheduler. Continuous mode = an EXTERNAL scheduler (cron/launchd/CI) running `codex exec "$(cat ~/.codex/prompts/shipflow-loop.md) once"` — always `once` per invocation. One loop per gh identity still applies |
| `EnterWorktree` | `git worktree add .worktrees/shipflow-loop -b shipflow-loop/base origin/<default>` (the loop-mode fallback path — it is harness-neutral) |
| `Read` tool on screenshots (evidence step) | Verify the PNGs exist and are non-empty (`file`, byte size); attach with `renaiss-shipflow issue evidence` exactly as documented. Codex `-i <image>` can view them when visual judgment is needed |
| `claude-in-chrome` MCP browser | Not needed — `browser-testing.md` already drives the gstack `browse` CLI, which is harness-neutral |
| Plugin auto-update hook | `git -C ~/.shipflow-skill pull --ff-only` at session start |

## Unchanged on every harness

- Every `renaiss-shipflow` command, flag, and exit-code contract.
- The Message style contract (`loop-mode.md` § "Message style") — graphical-first
  tables/mermaid/checklists/meters; GitHub renders them the same no matter who wrote them.
- Escalation lint rules, evidence pair rules, PR/issue body templates.
- Guardrails: never bare `pr merge`/`release` without explicit human confirmation;
  `merge-policy` governs automerge.

## Known degradations (accept, don't fight)

- No parallel subagents → a loop pass is slower; prefer `cap=1` and more frequent
  external ticks over big in-context passes.
- No session-scoped cron → dormancy between ticks lives in the external scheduler.
- The self-update check is manual (`git pull` above); pin a weekly reminder in the
  scheduler if drift matters.
