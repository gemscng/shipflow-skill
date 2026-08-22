# Running the ShipFlow skill under OpenAI Codex CLI

The `renaiss-shipflow` CLI is a plain Node binary and every command file in
this skill is harness-neutral; only the HARNESS differs on Codex — no plugin
cache, no Task-tool subagents, no CronCreate, no AskUserQuestion. Read this
adaptation map once at session start, then use the skill normally.

## Setup (replaces the Claude-Code preamble)

The SKILL.md preamble resolves the CLI from `~/.claude/plugins/cache/…`, which
doesn't exist on Codex. Instead (one-time install: `codex/README.md`):

```bash
git clone https://github.com/gemscng/shipflow-skill ~/.shipflow-skill
ln -sf ~/.shipflow-skill/bin/renaiss-shipflow ~/.local/bin/renaiss-shipflow
renaiss-shipflow --version   # sanity: bundled CLI runs under node >= 20
```

`gh` must be authenticated (`gh auth status`); `renaiss-shipflow login` is
identical on every harness.

## Harness affordance map

| Claude Code | Codex CLI equivalent |
|---|---|
| `AskUserQuestion` tool | Interactive: ask in plain text and wait. Headless (`codex exec`): NEVER wait — proceed per policy or `renaiss-shipflow issue escalate <n> --reason "..."` (SKILL.md's spawned-session contract applies as-is; set `SHIPFLOW_HEADLESS=1`) |
| Task-tool subagents (loop worker/reviewer roles) | Run the roles INLINE, sequentially: intake-review the issue, work it, self-review before approving; keep the role's contract file open while in it (`loop-worker.md`, `loop-reviewer.md`). Context hygiene: ONE issue per invocation, `cap=1` |
| Skill tool → `shipflow:smart-commit` (every loop commit) | No plugin namespace: read and follow `~/.shipflow-skill/skills/smart-commit/SKILL.md` from the clone and execute its plan (same loop adaptations: no AI-attribution trailer, skip the human-confirm gate). Never a bare `smart-commit`, never a repo-relative path |
| `CronCreate` continuous loop | No in-session scheduler: continuous mode = an EXTERNAL scheduler (cron/launchd/CI) running `codex exec "$(cat ~/.codex/prompts/shipflow-loop.md) once"` — always `once` per invocation; one loop per gh identity still applies |
| `EnterWorktree` | `git worktree add .worktrees/shipflow-loop -b shipflow-loop/base origin/<default>` (the loop-mode fallback path — harness-neutral) |
| `Read` tool on screenshots (evidence step) | Verify the PNGs exist and are non-empty (`file`, byte size); attach with `renaiss-shipflow issue evidence` exactly as documented. Codex `-i <image>` can view them when visual judgment is needed |
| `claude-in-chrome` MCP browser | Not needed — `browser-testing.md` drives the gstack `browse` CLI, harness-neutral |
| Plugin auto-update hook | `git -C ~/.shipflow-skill pull --ff-only` at session start |

## Unchanged on every harness

- Every `renaiss-shipflow` command, flag, and exit-code contract.
- The Message style contract (`loop-mode.md` § "Message style") —
  graphical-first tables/mermaid/checklists/meters.
- Escalation lint rules, evidence pair rules, the PR-body template, the
  issue-body ladder.
- Guardrails: never bare `pr merge`/`release` without explicit human
  confirmation; `merge-policy` governs automerge.

## Known degradations (accept, don't fight)

- No parallel subagents → slower passes; prefer `cap=1` and more frequent
  external ticks over big in-context passes.
- No session-scoped cron → dormancy between ticks lives in the external
  scheduler.
- Self-update is manual (`git pull` above); pin a weekly scheduler reminder if
  drift matters.
