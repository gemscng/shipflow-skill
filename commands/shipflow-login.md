---
description: Sign in to ShipFlow
---

Run `renaiss-shipflow login` (checks `gh auth status`, exchanges the gh token for a ShipFlow JWT, caches credentials in ~/.config/renaissshipflow/credentials.json).

If the GitHub App install is still awaiting an org admin's approval, run `renaiss-shipflow login --with-gh-token --org <org>` instead: it connects the org with the gh token (#980), whether the account has no ShipFlow org yet or is adding a further one. ShipFlow then acts as that GitHub account, and GitHub events are not delivered until the App is installed — the server switches to the App automatically once it is. The dashboard offers the same path under the org switcher ("Connect with a token") and on Settings → GitHub Integration.
