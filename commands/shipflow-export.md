---
description: Export ShipFlow issue details to an Excel (.xlsx) file
argument-hint: [filters, e.g. --state all --label bug --assignee alice]
---

Run `renaiss-shipflow issues export` and report the output path and issue count.

Arguments: $ARGUMENTS — pass them through. Supported filters (GitHub issue
semantics, passed to `gh issue list`): `--state open|closed|all`, `--label <l>`
(repeatable), `--assignee <login>`, `--author <login>`, `--mention <login>`,
`--milestone <name>`, `--search "<GitHub search syntax>"`, `--limit <n>`,
`--out <file.xlsx>`.

If the user described filters in prose (e.g. "closed bugs assigned to alice"),
translate them to flags: `--state closed --label bug --assignee alice`. When no
`--out` is given, the file lands in the current directory as
`shipflow-issues-<repo>-<date>.xlsx` — tell the user where it is.
