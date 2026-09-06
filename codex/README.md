# ShipFlow for OpenAI Codex CLI

Same skill, same `renaiss-shipflow` CLI — Codex-shaped install. This repo is
also a Codex plugin marketplace (`.agents/plugins/marketplace.json` +
`.codex-plugin/plugin.json`), so the plugin route is the default.

## Route A — Codex plugin (shows in `codex plugin list`)

```bash
codex plugin marketplace add gemscng/shipflow-skill   # registers the `shipflow` marketplace
codex plugin add shipflow@shipflow                    # installs the plugin: shipflow + smart-commit skills
npx -y @renaiss-shipflow/cli login                    # sign in once (rides on gh auth)
```

Optional, from the installed plugin: put the bundled CLI on PATH and install
the `/shipflow-*` custom prompts (the plugin itself carries skills only):

```bash
bash "$(ls -d ~/.codex/plugins/cache/shipflow/shipflow/*/ | sort -V | tail -1)codex/install.sh"
```

Update: `codex plugin marketplace upgrade shipflow` then `codex plugin add shipflow@shipflow`
again; start a new Codex thread to pick up the new version.

## Route B — clone + installer (no plugin system, or a pinned checkout)

```bash
git clone https://github.com/gemscng/shipflow-skill ~/.shipflow-skill
bash ~/.shipflow-skill/codex/install.sh   # CLI on PATH, /shipflow-* prompts, skills into ~/.codex/skills
renaiss-shipflow login
```

Update later with `git -C ~/.shipflow-skill pull --ff-only`; the skills are
symlinked into the clone, so they refresh with it. Re-run `codex/install.sh`
when the prompt set changes (it is idempotent). `SHIPFLOW_CODEX_LINK=copy`
copies the skills instead of linking; `CODEX_HOME` and `SHIPFLOW_BIN_DIR`
override the install locations. Do not combine A and B: Codex would list each
skill twice.

Either way, type `$shipflow` (or `$smart-commit`) in Codex, or just mention
ShipFlow — Codex picks the skill from its description. Harness differences
(no Task tool / CronCreate / AskUserQuestion) are mapped in
`skills/shipflow/references/codex.md`.
