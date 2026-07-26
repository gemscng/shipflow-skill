# Auto-update flow

Referenced by the skill **Preamble** when `bin/shipflow-update-check` prints
`UPGRADE_AVAILABLE <old> <new>`. Updating is automatic by default — opt out with
`SHIPFLOW_AUTO_UPDATE=false` (then the skill just notes an update exists and
continues).

## Steps

1. Refresh the marketplace and update the plugin (both no-op if already current):
   ```bash
   claude plugin marketplace update renaissshipflow >/dev/null 2>&1 || true
   claude plugin update shipflow@renaissshipflow >/dev/null 2>&1 || true
   ```
2. Tell the user, concisely:
   `⬆️ ShipFlow updated v{old} → v{new} — it loads automatically next session, or run /reload-plugins to apply it now.`
3. **Continue with the user's original request.** Never block on the update.

## How updates apply (no manual action needed)

A **SessionStart hook** (`hooks/hooks.json` → `bin/shipflow-session-start`)
silently installs any pending update at the start of each session. Combined with
this preamble, updates get installed proactively — you don't run anything — and
load **automatically on your next session**.

**Opt-in same-session apply (asked once):** the live-reload preference is
tri-state — `renaiss-shipflow config get live-reload` is `true`, `false`, or
`unset` (env `SHIPFLOW_LIVE_RELOAD` overrides). When it's **unset** and an update
installs, the SessionStart hook adds a note asking you to decide **once**:

> Ask the user whether to apply future ShipFlow updates in-session automatically
> (experimental). Persist with `renaiss-shipflow config set live-reload true`
> (or `false`). Then offer `/reload-plugins` to apply the current update now.

When the agent sees that note, ask the user once and run the matching
`config set live-reload …`; don't ask again after that. With `true`, the hook
refreshes the loaded plugin dir in place and emits `reloadSkills` so new
skills/commands apply in the **current** session (the gstack trick) — experimental:
it leaves the version label stale until the next restart and may not pick up every
change. `false` keeps the safe next-session default.

## Why the skill can't apply it *this* session

Claude Code **pins the plugin version at session start, before hooks run**, so a
freshly-installed version can't take effect in the current session — no command,
`reloadSkills`, hook, or API can swap the loaded plugin version mid-session
(verified against the docs). The only ways an installed update goes live:

- **Automatically** — at the next session start (the SessionStart hook already
  installed it, so it just loads). No user action.
- **Immediately** — the user runs **`/reload-plugins`** (a manual command; the
  assistant cannot self-type it).

A reload is only for **new/changed skill files** — added slash commands, edited
loop steps, reference docs. **The CLI is a different story, and it depends on
which channel PATH resolves** (issue #435):

| Channel (`version --json` → `channel`) | What runs | Auto-tracks the plugin cache? |
|---|---|---|
| `plugin-launcher` | `bin/renaiss-shipflow` → the **newest** cached plugin's bundled CLI (the preamble re-points its PATH symlink each run) | **yes** — a cache install goes live this session |
| `npm-global` | `~/.../lib/node_modules/@renaiss-shipflow/cli` — installed from npm, **shadows the launcher on PATH** | **NO** — it tracks nothing; only `npm i -g` moves it |
| `unknown` | a dev checkout / something else | no |

⚠️ **The old claim that "the CLI auto-tracks the newest cached version" is only
true on `plugin-launcher`.** When an npm-global install wins PATH — the common
case on a dev machine — updating the plugin cache changes **nothing** about the
binary the loop shells out to, and the two silently diverge. Measured on one
machine: plugin 0.27.5 loaded, 0.27.10 cached, CLI **0.28.2** running. Nothing
reconciles those three, and `bin/shipflow-update-check` compares only the plugin
against the marketplace manifest — never the npm CLI — and runs at SessionStart,
so it cannot fire mid-loop.

**Check it, don't assume it:** `renaiss-shipflow version --json` reports
`channel`, `registry` (npm's `latest` dist-tag — the reference, never the working
tree) and `drift` ∈ `current`/`stale`/`ahead`/`unknown`, plus a
channel-appropriate `remediation.command`. `version --check` exits **9** when the
running binary is behind. A long `/shipflow-loop` runs this after every merge and
at each tick start (`loop-mode.md` §0) — a stale CLI reports *fewer* blockers, so
it biases the loop toward merging what should park.

(Historical note: before the launcher fix, it ran its co-located CLI and the
preamble only symlinked when none existed — so the symlink stranded on the first
version forever. Fixed for the launcher path; it never applied to an npm-global
install, which is the gap above.)

## Long-running sessions (e.g. an open `/shipflow-loop`)

A long loop session never restarts, so it keeps the **skill files** it loaded at
start. Its CLI updates live **only on the `plugin-launcher` channel** (table
above) — on `npm-global` the running binary is frozen until someone runs
`npm i -g`, which is why the loop re-checks `version --json` after every merge
and at each tick start and upgrades itself (`loop-mode.md` §0). If a bug fix is
in a skill/loop doc, periodically run **`/reload-plugins`** (or restart) to pick
it up. When the update check shows a new version mid-loop, surface a one-line
nudge — and say which half moved:
`⬆️ ShipFlow vX cached; CLI drift <drift> (channel <channel>); /reload-plugins to refresh skill docs.`

If `claude plugin update` is unavailable or errors, tell the user to run
`/shipflow-update` (or `claude plugin update shipflow@renaissshipflow`) manually,
then continue with their request.
