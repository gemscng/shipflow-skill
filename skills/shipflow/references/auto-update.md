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

Most behavior needs **no** reload anyway: the `renaiss-shipflow` **CLI auto-tracks
the newest cached version**. The launcher (`bin/renaiss-shipflow`) resolves the
**newest** installed plugin's bundled CLI at run time, and the preamble re-points
its PATH symlink to the newest version every run — so once the SessionStart hook
installs a new version to the cache, CLI behavior (commands, inbox, config, bug
fixes) updates **live this session**, no reload. A reload is only for **new/changed
skill files** — added slash commands, edited loop steps, reference docs.

(Historical note: before this, the launcher ran its co-located CLI and the preamble
only symlinked when none existed — so the symlink stranded on the first version
forever, and the CLI never updated even as the plugin did. Fixed: launcher +
preamble now always resolve/point to the newest cached version.)

## Long-running sessions (e.g. an open `/shipflow-loop`)

A long loop session never restarts, so it keeps the **skill files** it loaded at
start — but its **CLI auto-updates** (above). If a bug fix is in the CLI (most are:
commands, signals, mappings), it's already live. If it's in a skill/loop doc,
periodically run **`/reload-plugins`** (or restart) to pick it up. When the update
check shows a new version mid-loop, surface a one-line nudge:
`⬆️ ShipFlow vX live (CLI auto-updated); /reload-plugins to also refresh skill docs.`

If `claude plugin update` is unavailable or errors, tell the user to run
`/shipflow-update` (or `claude plugin update shipflow@renaissshipflow`) manually,
then continue with their request.
