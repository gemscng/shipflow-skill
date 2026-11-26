# Running ShipFlow in Orca Editor

When an agent (Claude Code, Codex, Antigravity, Cursor, or OpenCode) runs inside
an **Orca Editor** workspace (`$ORCA_WORKSPACE_ID` or `$ORCA_WORKTREE_ID` is set
and `orca` is on `PATH`), ShipFlow binds every worked issue and pull request to
its Orca workspace so pressing **Resume** on a task card in Orca jumps directly
back into that task's agent chat.

Opt out of automatic CLI workspace sync at any time with
`SHIPFLOW_ORCA_SYNC=false`.

## Automatic CLI task sync (dedicated Orca workspaces)

Inside a non-main Orca task worktree (or an Orca folder workspace), the
`renaiss-shipflow` CLI updates Orca metadata automatically (best-effort, silent
on failure so `--json` stdout and exit codes never change):

| ShipFlow CLI step | Orca workspace update |
|---|---|
| `renaiss-shipflow issue work <n>` · `renaiss-shipflow issue create --claim --lint=strict` · dedicated-worktree `renaiss-shipflow issue next` | Attaches the GitHub issue URL (`orca reference add`) and sets `--issue <n> --workspace-status in-progress` (skips if the workspace is already linked to another issue) |
| `renaiss-shipflow issue escalate <n> --reason "..."` | Sets a short blocker `--comment` and marks `--unread` so Orca's sidebar attention dot lights up for a human to press **Resume** and reply in that chat |
| `renaiss-shipflow pr create --lint=strict` | Attaches the PR URL (and linked issue URL when unset) and sets `--pr <pr> --workspace-status in-review` |
| `renaiss-shipflow pr merge <n>` · `renaiss-shipflow pr automerge` | Resolves the PR's Orca worktree (`current` or `branch:<headBranch>`, when its linked PR matches or is unset), marks `--workspace-status completed --read`, and **detaches `HEAD` instead of deleting the Orca worktree** so the task card and its resumable chat history survive merge |

Main checkouts (`isMainWorktree`, fixed `main`/`master` workspaces, default git
branches) and the reusable `shipflow-loop` orchestrator worktree are skipped so
coordinator or `main` panes never inherit individual issue links. Folder
workspaces (`folder:<id>`) attach URLs via `orca reference add` and update
`--workspace-status` without passing unsupported `--issue` or `--pr` flags.

## Guided single-issue work from `main`

If the user asks to pick up or hand off `#<n>` while you are sitting in `main`
rather than a dedicated task workspace, spin up an Orca child workspace bound to
the issue so it gets its own resumable chat:

```bash
orca worktree create \
  --name "issue-<n>-<slug>" \
  --parent-worktree active \
  --reference "https://github.com/<owner>/<repo>/issues/<n>" \
  --agent "<current-agent>" \
  --prompt "Run renaiss-shipflow issue work <n> --json and work through #<n>." \
  --json
```

If you are already in a dedicated Orca task workspace for `#<n>`, stay in it —
`renaiss-shipflow issue work <n> --json` and `renaiss-shipflow pr create --json
--lint=strict` link the task automatically.

## Loop mode (`/shipflow-loop`) in Orca — kept-open worker chats

Ephemeral harness subagents (`Task` tool) plus raw `.worktrees/shipflow-loop-<n>`
checkouts removed with `git worktree remove` leave **no Orca session** behind, so
tasks in Orca Editor would have no chat to **Resume**. When `$ORCA_WORKSPACE_ID`
is set and `orca` is on `PATH`, adapt worker dispatch in `loop-mode.md` and
`loop-worker.md` as follows:

1. **Orchestrator stays in `shipflow-loop`.** Serial steps (`inbox`, `issue
   next`, `pr automerge`, drift check, ledger) still run in the orchestrator
   worktree (`loop-setup.md`).
2. **Phase B fix workers — dispatch via Orca orchestration with `--keep-open`.**
   Instead of an ephemeral subagent creating `.worktrees/shipflow-loop-<n>`,
   launch a supervised Orca worker in a `new-child` Orca worktree and attach the
   issue reference immediately:

   ```bash
   orca orchestration worker-start \
     --spec-file "<scratch>/issue-<n>-spec.txt" \
     --task-title "#<n> <title>" \
     --display-name "#<n> <title>" \
     --worktree new-child \
     --name "fix-issue-<n>-<slug>" \
     --agent "<current-agent>" \
     --keep-open \
     --json
   ```

   Using the returned child worktree `id`, link the issue right away:

   ```bash
   orca reference add "https://github.com/<owner>/<repo>/issues/<n>" --worktree "id:<childWorktreeId>" --json
   orca worktree set --worktree "id:<childWorktreeId>" --issue "<n>" --workspace-status in-progress --json
   ```

3. **Inside the Orca fix worker (`loop-worker.md` adaptation).** You are already
   inside your own isolated Orca child worktree (`$ORCA_WORKSPACE_ID`):
   - **Branch in place:** `git fetch origin && git checkout -B
     fix/issue-<n>-<slug> origin/<default>` (never add a nested
     `.worktrees/shipflow-loop-<n>`).
   - **Open PR & evidence as usual:** `renaiss-shipflow pr create --json
     --lint=strict --loop-review` automatically attaches the PR URL and flips
     your Orca workspace to `in-review`; `renaiss-shipflow issue escalate <n>
     --category <cat> --reason "..."` marks `--unread` so the operator can press
     **Resume** in Orca and answer in your chat.
   - **Never remove your Orca worktree** (`git worktree remove` does not run on
     Orca workspaces). Settle the Orca dispatch (`worker_done`) with the compact
     JSON return so Orca wakes the orchestrator while keeping your chat open for
     **Resume**.
4. **Phase A reconcile workers — resume the PR's existing Orca chat.** Before
   starting a new worker for PR `#<pr>`, look up its bound Orca workspace and
   worker via `orca reference find "https://github.com/<owner>/<repo>/pull/<pr>"
   --json`:
   - Matching `dispatch:<id>` mailbox present → send the reconcile spec to that
     same worker with `orca orchestration send --to "dispatch:<id>" --type
     dispatch --subject "PR #<pr> reconcile" --body "<reconcile spec>" --json` so
     every review/CI/conflict round stays in **one resumable chat**.
   - No prior Orca worker (e.g. a PR opened outside Orca) → start a `new-child`
     `orca orchestration worker-start --keep-open` worker for `<pr-branch>`,
     checkout `<pr-branch>` in place, and attach the PR with `orca reference
     add` + `orca worktree set --pr <pr> --workspace-status in-review`.
5. **Reviewer role stays stateless.** Intake (`loop-reviewer-intake.md`) and PR
   gate (`loop-reviewer.md`) reviews remain fast read-only subagents (or inline
   passes when subagents are unavailable); operators resume the **worker** chat
   that owns the branch.
6. **Merge preserves Resume.** When `renaiss-shipflow pr automerge` merges PR
   `#<pr>`, the CLI marks the Orca workspace `completed` and detaches `HEAD`
   without deleting the Orca directory — pressing **Resume** in Orca Editor still
   reopens the full conversation until Orca's own workspace cleanup rules archive
   it.
