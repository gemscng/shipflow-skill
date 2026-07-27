---
description: File a new ShipFlow issue
argument-hint: <title / description>
---

Create a ShipFlow issue with `renaiss-shipflow issue create --title "..." --body "..."`, deriving the title and body from: $ARGUMENTS. Note: creating an issue does not claim it.

A screenshot is worth more than prose: when the report describes something visible (a broken layout, a wrong render, an error dialog) and a screenshot or recording file is available — or you can capture one with the browser tools — attach it with `--screenshot <path...>` (repeatable; add `--screenshot-caption "<what this shot shows>"` per shot, by position). The files are hosted and embedded in the issue body. If the upload fails the issue is NOT created — retry, or create without `--screenshot` and attach via `issue evidence --image` afterwards.
