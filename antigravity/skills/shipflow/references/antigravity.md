# ShipFlow in Antigravity CLI

Install the published plugin with `agy plugin install https://github.com/gemscng/shipflow-skill/tree/main/antigravity`.
Run `agy plugin list --json` to find the installed path and skills. Start a new
`agy` session, then use `/shipflow:shipflow-status`, `/shipflow:shipflow-work 42`, `/shipflow:smart-commit`,
or ask for ShipFlow in natural language.

From a ShipFlow source checkout with its Bun dependencies installed, run
`node scripts/shipflow-plugin/antigravity/package.mjs`. Use
`agy plugin install ./dist/antigravity` to install the local build.

## Use the installed bundle

Resolve the plugin root from the containing references directory (three directories up).
Resolve `skills/` and `bin/` against that root. For each shell
invocation, run the bundled `node "$PLUGIN_DIR/cli/dist/renaiss-shipflow.mjs"`
in the user's project directory wherever a command says `renaiss-shipflow`.
Sign in with its `login` command after `gh auth login`. Node 20+ and GitHub CLI
are required. Keep the project's current working directory for repo detection.

## Command adaptations

- **Version and update.** Read `plugin.json` for the installed plugin version and run the bundled CLI's `--version`. To update, use `agy plugin install https://github.com/gemscng/shipflow-skill/tree/main/antigravity` and start a new session.
- **Loops.** Read the shared loop contracts and use `SHIPFLOW_USAGE_SOURCE=antigravity` for the bundled `bin/shipflow-usage`. Its live reading comes from `agy -p /usage`. When over the configured threshold, wait for the reported reset. Use Antigravity's available subagents for the loop roles or run the roles sequentially. In print mode set `SHIPFLOW_HEADLESS=1`. Keep any continuous loop attached to the session.
- **Engine.** Use `agent status --json` for status. Start `agent serve` as a session-tracked process and stop that same process on request. The `agent serve` command uses the local relay's configured Claude executable. For a server workflow powered by this installation of `agy`, configure the server's `antigravity-cli` backend. Run long-lived commands only through the host session's tracked tasks.
- **Commits.** Invoke `/shipflow:smart-commit` or load this plugin's `skills/smart-commit/SKILL.md`. Apply ShipFlow's usual confirmation and merge policies.
