---
description: Make this machine the org's AI engine — run every ShipFlow workflow's model calls locally (start|stop|status)
---

Engine mode (`skills/shipflow/references/agent-engine.md`): the ShipFlow
server keeps orchestrating all twelve workflows (GitHub, reports,
notifications, tool handlers) but relays **every model call** to this
machine's Claude Code, so it spends no AI credits for the org while the
engine runs. Distinct from `/shipflow-loop takeover=on`, which only takes
the loop's three events — both can run at once (the engine then answers
the loop's server calls too).

Argument: `start` (default) · `stop` · `status`. Optional tokens on
`start`: `model=<id>` · `concurrency=<n>` · `agent=<label>`.

**start** — run in the background (it is a long-lived process; never block
the session on it):

```bash
mkdir -p -m 700 ~/.shipflow && touch ~/.shipflow/engine.log && chmod 600 ~/.shipflow/engine.log
nohup renaiss-shipflow agent serve --json \
  ${MODEL:+--model "$MODEL"} ${CONCURRENCY:+--concurrency "$CONCURRENCY"} ${AGENT:+--agent "$AGENT"} \
  >> ~/.shipflow/engine.log 2>&1 &
echo $! > ~/.shipflow/engine.pid
sleep 3; tail -c 2000 ~/.shipflow/engine.log
```

The log lives under `~/.shipflow` (never in the repo) and the `--json`
events carry job ids and sizes only — no prompts. Report the first
`started` event, or the error: exit 3 = another member holds the org (name
them and stop); exit 1 with *engine mode is not enabled* / *needs an owner
or admin* = the trust gate (an owner/admin turns on **Local engine
takeover** in Settings → Local Agents, and only owners/admins may serve). Then one line: *"Local engine running
(pid N) — every workflow's model calls now run here; `/shipflow-engine
status` for the log, `/shipflow-engine stop` to hand the org back."*
Remind the user the machine must stay awake: a closed laptop frees the org
within 5 minutes and the server resumes its own model calls.

**status** — `renaiss-shipflow agent status --json` + the last 20 lines of
`~/.shipflow/engine.log`. Render graphical-first: one verdict line (holder,
mode, minutes until the lease lapses), then a table of the recent jobs
(`| When | Workflow/stage | Result | Tokens | Model |`) from the `finished`
events.

**stop** — `kill $(cat ~/.shipflow/engine.pid)` (SIGTERM: the engine finishes
its current poll, releases the org, exits), wait for the `stopped` event in
the log, then `renaiss-shipflow agent status` to confirm the org is
processed server-side again. Remove the pid file.

Never run `agent serve` in the foreground from this command, and never
`agent release` while the engine is running — stop the process instead.

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-engine.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
