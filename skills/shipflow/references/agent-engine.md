# Engine mode — take over all the server workload

`renaiss-shipflow agent serve` makes this machine the org's **AI engine**.
The ShipFlow server keeps orchestrating every workflow (webhooks, GitHub
reads and writes, reports, notifications, the tool handlers a workflow
exposes to the model) but **every model call travels to your machine**,
runs on your Claude Code (`claude -p`, your subscription), and the answer
goes back. While the engine runs the server spends no AI credits for the
org — all twelve workflow types, not just three.

Two takeover modes exist on the same per-org lease
(`renaiss-shipflow agent status --json` → `takeover.mode`):

| Mode | Started by | What the local machine takes | What the server still does |
|---|---|---|---|
| `loop` (#1151) | `/shipflow-loop takeover=on` / `agent takeover` | the automatic **issue-triage, PR-review and test-runner events** (the loop performs them itself; the server records them as *handed off*) | every other workflow, on its own AI backend |
| `engine` | `agent serve` / `/shipflow-engine` | **every model call of every workflow**, tool use included | all orchestration; hands nothing off; runs no model calls of its own |

Both may run at once: with the engine up, the loop's own server calls are
answered by the engine as well. One lease per org: `agent serve` on a
machine held by someone else exits 3 and names them.

## Running it

```bash
renaiss-shipflow agent serve                       # foreground; Ctrl-C releases the org
renaiss-shipflow agent serve --model claude-opus-5 # run every job on one model
renaiss-shipflow agent serve --concurrency 2       # two jobs at a time
renaiss-shipflow agent serve --once                # serve one job, then stop (smoke test)
renaiss-shipflow agent serve --json                # one JSON line per event (what /shipflow-engine tails)
```

Flags: `--agent <label>` (lease label; default `$SHIPFLOW_AGENT` or the
hostname) · `--claude-bin <path>` (default `$SHIPFLOW_CLAUDE_BIN` or
`claude` on PATH) · `--ttl-minutes <n>` (lease lifetime, default 5, renewed
automatically at 40 %) · `--job-timeout-minutes <n>` (kill a local run,
default 15) · `--max-jobs <n>`.

Prerequisites: signed in to the org (`renaiss-shipflow login`) as an
**owner or admin**, the org's *Local engine takeover* setting turned on
(Settings → Local Agents), Claude Code installed and logged in on this
machine. The engine
strips `CLAUDECODE`/`ANTHROPIC_API_KEY`-style variables before spawning, so
it also works from inside a Claude Code session (`/shipflow-engine` runs it
in the background).

Log line per job: `✓ patch_notes/draft (complete, 0abc12) in 12.3s · 1200
in / 300 out · claude-sonnet-5`; `✗ …: <error>` on failure. The dashboard
sidebar shows **Local engine · @you (host)** while the lease is active
(warning tone once the heartbeat is older than 4 min).

## How a job flows

```mermaid
sequenceDiagram
  participant W as server worker
  participant Q as agent_jobs (Mongo)
  participant E as agent serve (your machine)
  participant C as claude -p
  W->>Q: relay.Client queues {kind, request, model} instead of calling its backend
  E->>Q: GET /agent/jobs/next (long-poll, claims oldest)
  E->>C: spawn with the server's own flags; prompt on stdin
  C-->>E: tools/call via local MCP bridge (tools jobs)
  E->>W: POST /agent/jobs/{id}/tool-calls → worker runs the workflow's handler
  W-->>E: output (long-poll GET …/tool-calls/{call})
  C-->>E: result event
  E->>Q: POST /agent/jobs/{id}/result
  Q-->>W: response → workflow continues as if its backend answered
```

The engine passes the same flags the server's CLI client uses (`-p
--output-format json --no-session-persistence --tools ""`, `--effort`,
`--system-prompt`, `--mcp-config` + `--allowedTools` + `--strict-mcp-config`
for tool jobs, `--max-turns`, `--model`), so a relayed call behaves like a
server-side one; images go through the stream-json path.

## Trust gates (issue #1180)

Engine mode moves every prompt of the org to one machine, so four gates
sit in front of it:

| Gate | Where | What you see when it closes |
|---|---|---|
| **Org opt-in** — an owner/admin turns on *Local engine takeover* in the dashboard (Settings → Local Agents), i.e. `PATCH /orgs/{org}/settings {engine_takeover_enabled:true}` | takeover POST and every engine job route | `agent serve` exits 1: *engine mode is not enabled for this org…*; `agent status` prints *Engine mode: off* |
| **Owner/admin only** — a plain member cannot become the engine, even with the opt-in | same | exit 1: *engine mode needs an owner or admin* |
| **Declared tools only** — an engine-filed tool call must name one of the job's `request.tools`; the API answers 400 `TOOL_NOT_DECLARED`, and the worker refuses it a second time before any handler runs. Every call, served or rejected, lands in the org audit log as `agent.engine.tool_call` (tool, workflow, execution, holder; no bodies) | `POST …/tool-calls`, `relay.Client` | the model gets a tool error; the audit log shows the attempt |
| **Per-job bridge bearer** — the local MCP bridge only answers requests carrying the random token written into that job's `--mcp-config` (file mode 0600); another local process that finds the port gets 401 | `agent serve` | nothing visible; the bridge counts 0 calls |

Turning the setting off or demoting the holder cuts the relay at once:
the next poll is refused, queued jobs go unclaimed, and after 90 s the
server runs them itself.

Logs: `/shipflow-engine` writes `~/.shipflow/engine.log` (directory 0700,
file 0600), and `agent serve --json` events carry job identity and sizes
only — never a prompt, an answer, or a tool body.

## Fallback and failure policy

- **No engine claims a job within 90 s** (laptop asleep, lease not lapsed
  yet): the worker runs that call on the server backend and logs a warning
  naming the holder. Nothing is lost; those calls cost server credits.
- **The engine claimed the job and failed** (local usage limit, CLI error,
  15-min timeout): the call fails and the workflow execution fails with
  `local engine @you (host) failed job …: <error>`. It is **not** retried on
  the server — the org never spends credits behind the holder's back.
  Re-trigger the workflow after fixing the local side.
- **Lease lapse**: the engine renews every ~2 min on a 5-min lease. Ctrl-C
  or `/shipflow-engine stop` releases at once; a dead machine frees the org
  within 5 min and the server resumes its own model calls.
- **Lost the org** (another member took it): `serve` stops with exit 3 and
  leaves their lease alone.

Exit codes: 0 stopped/finished · 1 usage error · 3 another member holds the
org · 2 unexpected.

## API (for other tooling)

`GET /api/v1/orgs/{org}/agent/jobs/next?wait=20&agent=` (200 job / 204
none / 409 not the engine holder) · `POST …/jobs/{id}/result`
`{response|error}` · `POST …/jobs/{id}/tool-calls?wait=` `{name,input}` ·
`GET …/jobs/{id}/tool-calls/{call_id}?wait=`. The lease is
`POST …/agent/takeover {mode:"engine", ttlMinutes}`. Only the org's active
engine holder may call the job routes.
