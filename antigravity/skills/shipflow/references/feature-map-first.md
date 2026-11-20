## ShipFlow feature map: read it before changing code

In a repo ShipFlow tracks, before changing code:

1. Run `renaiss-shipflow features --json` (or `--category <area>`). If it errors, the repo is not in ShipFlow: skip the rest of this section.
2. Find the features whose `paths` cover the files you will change, and read their `test_priority` and `test_cases`. Neighbours are other features that list the same files; `coChangeMatrix` shows files that usually change together.
3. Stay inside those features' paths. If you change a neighbouring feature's files, name that feature in the PR.
4. Empty map (no features, or `degraded: ["empty-map"]`): run `renaiss-shipflow features generate --json` once, then repeat step 1.
