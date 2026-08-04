# Auto-update flow

Referenced by the skill **Preamble** when `bin/shipflow-update-check` prints
`UPGRADE_AVAILABLE <old> <new>`. Updating is automatic by default — opt out
with `SHIPFLOW_AUTO_UPDATE=false` (then just note an update exists and
continue).

## Steps

1. Refresh the marketplace and update the plugin (both no-op if current):
   ```bash
   claude plugin marketplace update renaissshipflow >/dev/null 2>&1 || true
   claude plugin update shipflow@renaissshipflow >/dev/null 2>&1 || true
   ```
2. Tell the user, concisely:
   `⬆️ ShipFlow updated v{old} → v{new} — it loads automatically next session, or run /reload-plugins to apply it now.`
3. **Continue with the user's original request.** Never block on the update.

## How updates apply (no manual action needed)

A **SessionStart hook** (`hooks/hooks.json` → `bin/shipflow-session-start`)
silently installs any pending update at each session start, so updates load
**automatically next session** — you run nothing.

**Opt-in same-session apply (asked once):** live-reload is tri-state —
`renaiss-shipflow config get live-reload` is `true`, `false`, or `unset` (env
`SHIPFLOW_LIVE_RELOAD` overrides). When **unset** and an update installs, the
hook adds a note: ask the user **once**, persist the answer with
`renaiss-shipflow config set live-reload true` (or `false`), offer
`/reload-plugins` for the current update, and never re-ask. `true` → the hook
refreshes the loaded plugin dir in place and emits `reloadSkills`, applying
new skills/commands in the **current** session (experimental: the version
label stays stale until restart; may miss some changes). `false` → the safe
next-session default.

## Why the skill can't apply it *this* session

Claude Code **pins the plugin version at session start, before hooks run** —
no command, `reloadSkills`, hook, or API can swap the loaded plugin version
mid-session. An installed update goes live **automatically** at the next
session start, or **immediately** when the user runs **`/reload-plugins`**
(manual — the assistant cannot self-type it).

A reload only covers **new/changed skill files** (slash commands, loop steps,
reference docs). **The CLI depends on which channel PATH resolves** (#435):

| Channel (`version --json` → `channel`) | What runs | Auto-tracks the plugin cache? |
|---|---|---|
| `plugin-launcher` | `bin/renaiss-shipflow` → the **newest** cached plugin's bundled CLI (the preamble re-points its PATH symlink each run) | **yes** — a cache install goes live this session |
| `npm-global` | `~/.../lib/node_modules/@renaiss-shipflow/cli` — installed from npm, **shadows the launcher on PATH** | **NO** — only `npm i -g` moves it |
| `unknown` | a dev checkout / something else | no |

⚠️ Auto-tracking holds **only on `plugin-launcher`**. When an npm-global
install wins PATH (common on a dev machine), a cache update changes
**nothing** about the binary the loop shells out to — the two silently
diverge (measured). `bin/shipflow-update-check` compares only the plugin
against the marketplace manifest — never the npm CLI — and runs at
SessionStart, so it cannot fire mid-loop.

**Check it, don't assume it:** `renaiss-shipflow version --json` reports
`channel`, `registry` (npm's `latest` dist-tag — the reference, never the
working tree) and `drift` ∈ `current`/`stale`/`ahead`/`unknown`, plus a
channel-appropriate `remediation.command`. `version --check` exits **9** when
the running binary is behind. A long `/shipflow-loop` runs this after every
merge and at each tick start (`loop-mode.md` §0) — a stale CLI reports *fewer*
blockers, biasing the loop toward merging what should park.

## Long-running sessions (e.g. an open `/shipflow-loop`)

A long loop session keeps its start-time **skill files**; its CLI updates
live **only on `plugin-launcher`** — on `npm-global` it is frozen until
`npm i -g` (hence the loop's `version --json` re-check above). Skill/loop-doc
fixes need a periodic **`/reload-plugins`** (or restart). On a mid-loop new
version, surface a one-line nudge saying which half moved:
`⬆️ ShipFlow vX cached; CLI drift <drift> (channel <channel>); /reload-plugins to refresh skill docs.`

If `claude plugin update` is unavailable or errors, tell the user to run
`/shipflow-update` (or `claude plugin update shipflow@renaissshipflow`)
manually, then continue with their request.
