---
description: Sign in to ShipFlow
---

Run `renaiss-shipflow login` (checks `gh auth status`, exchanges the gh token for a ShipFlow JWT, caches credentials in ~/.config/renaissshipflow/credentials.json).

Several orgs on one device (#1146): each org keeps its own store. `renaiss-shipflow login --org <org>` writes that org's credentials to the store already holding it, else the default store while it is empty, else `~/.config/renaissshipflow/profiles/<org>` — a second org never overwrites the first. `renaiss-shipflow login --all` signs in to every tenant the account belongs to in one go. Afterwards every command picks the store from the repo's `origin` owner, so no `--profile` is needed per command; `renaiss-shipflow profiles` shows which store the current repo uses. When a repo's owner has no store, ShipFlow calls there return 404/403 — sign in for that org rather than treating it as an outage.

If the GitHub App install is still awaiting an org admin's approval, run `renaiss-shipflow login --with-gh-token --org <org>` instead: it connects the org with the gh token (#980), whether the account has no ShipFlow org yet or is adding a further one. ShipFlow then acts as that GitHub account, and GitHub events are not delivered until the App is installed — the server switches to the App automatically once it is. The dashboard offers the same path under the org switcher ("Connect with a token") and on Settings → GitHub Integration.

<!-- Codex CLI custom prompt (generated from .claude/commands/shipflow-login.md).
     Install per codex/README.md; harness adaptation: skills/shipflow/references/codex.md -->
