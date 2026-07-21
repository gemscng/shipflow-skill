---
description: Open a PR for review via ShipFlow
---

After committing, run `renaiss-shipflow pr create --json`. Reference the issue in the body (`Fixes #<n>` for a full fix, `Part of #<n>` for a slice). Extra args: $ARGUMENTS

The PR body follows the graphical-first Message style (`loop-mode.md` § "Message style"): **Root cause** ≤3 bullets (mermaid if the failure is a flow) · **Changed** table (file → what) · **Testing** checklist with numbers · **Evidence** images/links.
