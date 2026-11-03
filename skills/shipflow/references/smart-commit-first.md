## ShipFlow commits: use smart-commit (not bare git commit)

When you are about to create a git commit:

1. Do **not** run a bare `git commit` / `git commit -m …` from the shell.
2. Invoke the bundled skill **`shipflow:smart-commit`** (Skill tool, plugin-qualified — #544). No Skill tool / plugin namespace → Codex: `$smart-commit`; Cursor: read and follow `skills/smart-commit/SKILL.md` from the same resolved skill root as ShipFlow (never a bare name, never a loop worktree copy). See `references/message-style.md` § "Commit messages".
3. When executing that skill's plan, prefix each commit shell with the allow marker so the plugin PreToolUse gate lets it through: `SHIPFLOW_SMART_COMMIT=1 git commit …` (same for amend). Loop adaptations still apply: no AI-attribution trailer; skip the human-confirm gate.
4. Opt out of the gate/hint: `SHIPFLOW_SMART_COMMIT_HOOK=false`.
