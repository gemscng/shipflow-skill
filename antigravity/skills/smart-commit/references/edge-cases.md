# Edge Cases & Examples

## Edge Cases

### No Changes in Scope
Say what is in the working tree and why none of it matches the request.
Offer to commit specific files the user names. Never fall back to
`git add .`.

### Single File with Multiple Concerns
Interactive staging (`git add -p`) does not work in an agent shell.
Stage part of a file without it:

1. `git diff -- <file> > <tmp>/full.patch`
2. Copy the patch and delete the hunks that belong to a later commit
   (keep each remaining hunk's header and all its lines intact).
3. `git apply --cached --check <tmp>/part.patch`, then
   `git apply --cached <tmp>/part.patch`
4. `git diff --cached -- <file>` to confirm only those hunks are staged.

Name the split in the plan: `src/api.ts (hunks 1–2 of 3)`.

### Merge Conflicts Present
Block and report:
```
Cannot proceed - merge conflicts detected. Please resolve conflicts first:
[list conflicted files]
```

### Uncommitted Dependencies
1. Identify the dependency chain
2. Order commits so dependencies come first
3. Warn if splitting would break the build

### Sensitive Files Detected
Check for and warn about `.env`, `*secret*`, `*credential*`, `*password*`, `*.pem`, `*.key`:
```
Warning: Potentially sensitive file detected: [filename]
Please confirm this should be committed, or add to .gitignore.
```

### Work in Progress
If changes appear incomplete (TODO comments, incomplete functions):
```
These changes appear to be work-in-progress. Would you like to:
1. Commit anyway with a WIP prefix
2. Continue working before committing
```

## Examples

### Config and Code Change Together
**Input**: A new ESLint rule plus the code changes it forces, and an
unrelated local script edit that was there before the session.

```
## Commit plan — 2 commits on chore/no-console

Commit 1/2  build(eslint): add no-console rule
  files   .eslintrc.js  +1 −0   adds "no-console": "error"
  body    - Stray console.log calls reached production logs twice
            last month
          - Lint now fails on console.log

Commit 2/2  refactor(utils): replace console.log with logger
  files   src/utils/logger.ts  +6 −2   adds debug() helper
          src/api/auth.ts      +3 −3   uses logger.debug
  body    - Moves remaining console.log calls to logger.debug so the
            new rule passes
          - No change in log output

Checks    npm run lint exit 0 · npm test exit 0 (212 passed)
Left out  scripts/local-seed.sh   modified before this session, unrelated
Flags     none

Commit these 2? (yes / edit / cancel)
```

Config comes first because it establishes the rule the second commit
satisfies.

### Breaking Change
```
feat(api)!: change authentication response format

- Mobile clients need refresh_token and expires_at alongside the
  token (#156)
- Replaces the flat token response with a nested auth object

BREAKING CHANGE: Authentication endpoint now returns
{ auth: { token, refresh_token, expires_at } } instead of { token }.

Clients must update their token extraction logic.

Closes #156
```
