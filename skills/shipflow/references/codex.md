# Running the ShipFlow skill under OpenAI Codex CLI

The `renaiss-shipflow` CLI is a plain Node binary and every command file in
this skill is harness-neutral; only the HARNESS differs on Codex — no plugin
cache, no Task-tool subagents, no CronCreate, no AskUserQuestion. Read this
adaptation map once at session start, then use the skill normally.

## Setup (replaces the Claude-Code preamble)

The SKILL.md preamble resolves the CLI from `~/.claude/plugins/cache/…`, which
doesn't exist on Codex. Two install routes (details: `codex/README.md`);
never both, or Codex lists each skill twice:

```bash
# Route A — Codex plugin (listed by `codex plugin list`; skills served from the plugin cache)
codex plugin marketplace add gemscng/shipflow-skill
codex plugin add shipflow@shipflow

# Route B — clone + installer (CLI on PATH, /shipflow-* prompts, skills linked into ~/.codex/skills)
git clone https://github.com/gemscng/shipflow-skill ~/.shipflow-skill
bash ~/.shipflow-skill/codex/install.sh
```

Either way `$shipflow` and `$smart-commit` are explicit invocations in Codex
and the skill is also auto-selected when the user mentions ShipFlow. Resolve
the CLI in this order — PATH, the clone, then the newest installed plugin
(the plugin copy carries `bin/` and `cli/dist`):

```bash
SHIPFLOW_CLI=$(command -v renaiss-shipflow 2>/dev/null \
  || ls ~/.shipflow-skill/bin/renaiss-shipflow 2>/dev/null \
  || ls -d ~/.codex/plugins/cache/shipflow/shipflow/*/bin/renaiss-shipflow 2>/dev/null | sort -V | tail -1)
"$SHIPFLOW_CLI" --version   # sanity: bundled CLI runs under node >= 20
```

`gh` must be authenticated (`gh auth status`); `renaiss-shipflow login` is
identical on every harness.

## Harness affordance map

| Claude Code | Codex CLI equivalent |
|---|---|
| `AskUserQuestion` tool | Interactive: ask in plain text and wait. Headless (`codex exec`): NEVER wait — proceed per policy or `renaiss-shipflow issue escalate <n> --reason "..."` (SKILL.md's spawned-session contract applies as-is; set `SHIPFLOW_HEADLESS=1`) |
| Task-tool subagents (loop worker/reviewer roles) | Run the roles INLINE, sequentially: intake-review the issue, work it, self-review before approving; keep the role's contract file open while in it (`loop-worker.md`, `loop-reviewer.md`). Context hygiene: ONE issue per invocation, `cap=1` |
| Skill tool → `shipflow:smart-commit` (every loop commit) | Invoke `$smart-commit` (served by the Codex plugin, or linked by `codex/install.sh`); if the skill is not installed, read and follow `~/.shipflow-skill/skills/smart-commit/SKILL.md` from the clone and execute its plan. Same loop adaptations either way: no AI-attribution trailer, skip the human-confirm gate. Never a bare `smart-commit`, never a repo-relative path |
| `CronCreate` continuous loop | Loop in-session: after each pass `sleep` the interval in ≤300 s chunks (raise the shell tool timeout per chunk), then run the next pass, until the user interrupts or says `stop`; `once` = one pass. Always-on: `shipflow-codex-loop` (§ Continuous mode below) |
| `EnterWorktree` | `git worktree add .worktrees/shipflow-loop -b shipflow-loop/base origin/<default>` (the loop-mode fallback path — harness-neutral) |
| `Read` tool on screenshots (evidence step) | Verify the PNGs exist and are non-empty (`file`, byte size); attach with `renaiss-shipflow issue evidence` exactly as documented. Codex `-i <image>` can view them when visual judgment is needed |
| `claude-in-chrome` MCP browser | Not needed — `browser-testing.md` drives the gstack `browse` CLI, harness-neutral |
| Usage gate (`shipflow-usage check` / `limit-reset`, loop-mode.md § "Usage gate") | Same tool, same exit codes, Codex's numbers: with `SHIPFLOW_USAGE_SOURCE=codex` it reads the live rate limits from `codex app-server` (what `/usage` shows — no statusline sink, never stale; `install-statusline` is a no-op). `limit-reset` spends one of the account's **rate-limit reset credits** (the "Full reset" `/usage` lists) — a Codex reset clears every window, so it also applies when the weekly window is the blocker; rails: only once the blocking window is at/over the **99%** reset floor (`reset-at=N` / `$SHIPFLOW_LOOP_RESET_AT`; over the 90% gate alone just pauses the tick), only with a credit, one attempt per cooldown, `SHIPFLOW_LOOP_LIMIT_RESET=off`. Resolve the tool: `shipflow-usage` on PATH (put there by `codex/install.sh`), else `"$(dirname "$(readlink -f "$SHIPFLOW_CLI")")/shipflow-usage"`. `shipflow-codex-loop` runs this gate itself before every tick and skips the tick when the reset does not clear it |
| Plugin auto-update hook | Route A: `codex plugin marketplace upgrade shipflow` then `codex plugin add shipflow@shipflow` again (new thread afterwards). Route B: `git -C ~/.shipflow-skill pull --ff-only` at session start — the skills are symlinks into the clone, so they refresh with it; re-run `codex/install.sh` when the prompt set changes |

## Continuous mode

In-session (interactive Codex) — never stop after one pass, never report "no
scheduler configured":

1. Run the pass, post the pass summary line.
2. `sleep` the interval in chunks of at most 300 s (`watch=15m` → three
   `sleep 300`), raising the shell tool's timeout above each chunk.
3. Run the next pass. Repeat until the user interrupts (Esc) or says `stop`;
   `stop` ends the loop after the current pass, `once` is a single pass.

The TUI shows each sleep as a running command, so the dormancy is visible.

Always-on (survives the session) — the supervisor the installer puts on PATH:

```bash
shipflow-codex-loop [once|stop] [watch=<dur>] [--dry-run] [loop tokens…]
```

One `codex exec --sandbox danger-full-access -C <repo> "<prompt> once …"` per
tick, sleeping `watch` (default `15m`) between ticks; a failing tick is logged,
not fatal. Before each tick it runs the usage gate (affordance map above) and
skips the tick — `⏸ paused · usage …` on stdout, `tick N skipped (usage gate)`
in the log — when Codex's limits are at/over `usage-max` and no reset credit
clears them. Log: `~/.shipflow/codex-loop.log`. Run it under nohup/tmux/launchd
for a reconciler independent of any terminal. Env knobs: `CODEX_BIN`,
`CODEX_HOME`, `SHIPFLOW_CODEX_SANDBOX`, `SHIPFLOW_LOOP_WATCH`,
`SHIPFLOW_CODEX_LOOP_DIR`, `SHIPFLOW_STATE_DIR`.

**Sandbox / network.** The loop needs network — `gh`, `git push`, npm, and the
ShipFlow API. Start interactive Codex with `codex --sandbox danger-full-access`,
or set `[sandbox_workspace_write] network_access = true` in
`~/.codex/config.toml`. Under a read-only or no-network sandbox those all fail
and the QA sweep reports "blocked by network restrictions" instead of filing
anything.

**Browser sweep.** The bug sweep's browser pass drives the gstack `browse` CLI
(`browser-testing.md`); without `browse` on PATH the sweep is tests-only and
files nothing from the browser.

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
- Dormancy between ticks is a shell `sleep` in the session (or the supervisor's
  sleep) — not a scheduler; a closed terminal ends the loop unless
  `shipflow-codex-loop` runs under nohup/tmux/launchd.
- Self-update is manual (`git pull` above); pin a weekly scheduler reminder if
  drift matters.
