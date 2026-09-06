# ShipFlow for OpenAI Codex CLI

Same skill, same `renaiss-shipflow` CLI — Codex-shaped install.

```bash
# 1. Clone this plugin repo to a stable path
git clone https://github.com/gemscng/shipflow-skill ~/.shipflow-skill

# 2. Install: CLI on PATH, /shipflow-* prompts, and the skills into ~/.codex/skills
bash ~/.shipflow-skill/codex/install.sh

# 3. Sign in once
renaiss-shipflow login
```

Then in Codex type `$shipflow` (or `$smart-commit`), or just mention ShipFlow —
Codex picks the skill from its description. `/shipflow-status`, `/shipflow-loop`
and the other custom prompts work as before.

Update later with `git -C ~/.shipflow-skill pull --ff-only`. The skills are
symlinked into the clone, so they refresh with it; re-run `codex/install.sh`
when the prompt set changes (it is idempotent). Set `SHIPFLOW_CODEX_LINK=copy`
before running it to copy the skills instead of linking; `CODEX_HOME` and
`SHIPFLOW_BIN_DIR` override the install locations.

Harness differences (no Task tool / CronCreate / AskUserQuestion) are mapped in
`skills/shipflow/references/codex.md`.
