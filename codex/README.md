# ShipFlow for OpenAI Codex CLI

Same skill, same `renaiss-shipflow` CLI — Codex-shaped install.

```bash
# 1. Clone this plugin repo to a stable path and put the CLI on PATH
git clone https://github.com/gemscng/shipflow-skill ~/.shipflow-skill
mkdir -p ~/.local/bin && ln -sf ~/.shipflow-skill/bin/renaiss-shipflow ~/.local/bin/renaiss-shipflow

# 2. Install the slash prompts (Codex custom prompts)
mkdir -p ~/.codex/prompts && cp ~/.shipflow-skill/codex/prompts/shipflow-*.md ~/.codex/prompts/

# 3. Point your AGENTS.md at the skill
#    Add to ~/.codex/AGENTS.md (or the repo's AGENTS.md):
#      When the user mentions ShipFlow or uses a /shipflow-* prompt, read
#      ~/.shipflow-skill/skills/shipflow/SKILL.md and
#      ~/.shipflow-skill/skills/shipflow/references/codex.md first.

# 4. Sign in once
renaiss-shipflow login
```

Update later with: `git -C ~/.shipflow-skill pull --ff-only`.
Harness differences (no Task tool / CronCreate / AskUserQuestion) are mapped in
`skills/shipflow/references/codex.md`.
