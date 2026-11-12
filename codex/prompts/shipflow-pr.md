---
description: Open a PR for review via ShipFlow
---

After committing, run `renaiss-shipflow pr create --json --lint=strict --issue <n>` (`--partial` for a slice). The footer it appends links the issue (`Closes #<n>`, or `Part of #<n>` for a slice); write `Fixes #<m>` only for other issues, below the outcome. Extra args: $ARGUMENTS

The PR body follows the graphical-first Message style (`loop-mode.md` § "Message style"), outcome first (#1476): `**Outcome:** <what changes for users>` · `**Risk:** <tier>: <why>` (low / medium / high and the file that set it, as `renaiss-shipflow pr ready` prints it) · **Evidence** images/links, each after-shot and defect shot with a red outline around the region its caption names (`references/browser-testing.md` § "Mark what changed") · **Changed** table (area → change) · `<details>` for **Root cause** (≤3 bullets, mermaid if the failure is a flow) and **Testing** (checklist with numbers) · `**How to revert:** <steps>` (usually `git revert <merge sha>`, plus any migration, config or deploy step it does not undo). Bullets ≤12 words. The command appends the ShipFlow footer (project and issue link) and prints `💡 readability:` advisories; fix them.

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-pr.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
