---
description: Open a PR for review via ShipFlow
---

After committing, run `renaiss-shipflow pr create --json --lint=strict`. Reference the issue in the body (`Fixes #<n>` for a full fix, `Part of #<n>` for a slice). Extra args: $ARGUMENTS

The PR body follows the graphical-first Message style (`loop-mode.md` § "Message style"): **Root cause** ≤3 bullets (mermaid if the failure is a flow) · **Changed** table (file → what) · **Testing** checklist with numbers · **Evidence** images/links, each after-shot and defect shot with a red outline around the region its caption names (`references/browser-testing.md` § "Mark what changed") · `**Risk:** <tier>: <why>` (low / medium / high and the file that set it, as `renaiss-shipflow pr ready` prints it) · `**How to revert:** <steps>` (usually `git revert <merge sha>`, plus any migration, config or deploy step it does not undo).
