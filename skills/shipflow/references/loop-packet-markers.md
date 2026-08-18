<!-- GENERATED from contracts/shipflow-contract.json → packetMarkers. Do not edit. -->
<!-- Regen: node scripts/check-degradation-markers.mjs --write -->

| Degradation marker in the packet | The check that did NOT run |
|---|---|
| `⚠️ review threads UNAVAILABLE — unresolved count NOT determined` | §0's approve precondition — the unresolved-thread count |
| `⚠️ Brief NOT loaded — issue #N could not be read` | the spec itself — judge nothing against a brief you never got |
| `⚠️ WARNING shipflow-api feature map unavailable … NOT checked` | the per-feature evidence-coverage check |
| `⚠️ triage unavailable — ShipFlow context and relatedFiles NOT loaded` | (intake mode) the issue's triage context |

| Line in the packet | What it means | Verdict effect |
|---|---|---|
| `NOTE per-feature evidence coverage not applicable — no ShipFlow feature map covers <repo> (cross-repo --repo target)` | no map could apply — nothing attempted, nothing failed | **none** — never `request_changes` |
| `NOTE #N is not a readable issue in <repo> — no acceptance brief to load` | stale link or a PR number — **GitHub answered**, nothing unavailable | **none** — judge the stale link on its merits |
| `⚠️ **No linked issue/brief found.**` | the PR links no issue at all | a finding to flag (§ above) — **not** the `Brief NOT loaded` line above |
