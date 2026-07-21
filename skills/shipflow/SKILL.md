---
name: shipflow
description: Drive ShipFlow from Claude Code via the `renaiss-shipflow` CLI, which signals ShipFlow (Discord, the dashboard, teammates) and uses gh for GitHub writes. Use when the user mentions ShipFlow, or wants to check project status / what to work on, list or file issues, pick up / claim / release an issue, attach test evidence (screenshot or video) to an issue, autonomously loop through and fix issues, open or merge a PR, run tests or regression, cut a release, or sign in. Also use proactively when the user starts feature/change work that has no issue (to relate it to an open issue or open one).
---

# ShipFlow

## Preamble (run first)

Self-update check + ensure the bundled CLI is runnable (cached; ~no overhead):

```bash
PLUGIN_DIR=$(ls -d ~/.claude/plugins/cache/renaissshipflow/shipflow/*/ 2>/dev/null | sort -V | tail -1)
# Link the newest plugin's CLI launcher onto PATH (next to node). ALWAYS re-point
# our own symlink to the newest cached version so the CLI never strands on an old
# one; never clobber a real (non-symlink) global install.
if [ -n "$PLUGIN_DIR" ]; then
  _ND=$(dirname "$(command -v node 2>/dev/null)" 2>/dev/null)
  _cur=$(command -v renaiss-shipflow 2>/dev/null || true)
  if [ -n "$_ND" ] && { [ -z "$_cur" ] || { [ -L "$_cur" ] && readlink "$_cur" 2>/dev/null | grep -q '.claude/plugins/cache/renaissshipflow/'; }; }; then
    ln -sf "$PLUGIN_DIR/bin/renaiss-shipflow" "$_ND/renaiss-shipflow" 2>/dev/null || true
  fi
fi
[ -n "$PLUGIN_DIR" ] && "$PLUGIN_DIR/bin/shipflow-update-check" 2>/dev/null || true
```

- If the check prints `UPGRADE_AVAILABLE <old> <new>` and `SHIPFLOW_AUTO_UPDATE`
  is not `false`: follow `references/auto-update.md` to update now, then continue
  with the user's request.
- Otherwise (no output): proceed normally.

## Platform adaptation — non-Claude harnesses

Running under **OpenAI Codex CLI** (or any harness without Claude Code's plugin
cache / Task tool / CronCreate / AskUserQuestion)? Read
`references/codex.md` FIRST — it maps every harness-specific affordance this
skill uses to its Codex equivalent, and replaces the preamble above (whose
plugin-cache path is Claude-Code-specific). Every `renaiss-shipflow` command,
guardrail, and message contract is identical across harnesses.

ShipFlow is a human-in-the-loop communication layer. Each command's value is the
side-effect signaled to ShipFlow — and through it to Discord, the dashboard, and
teammates — not the local action itself. Run commands via the `renaiss-shipflow`
CLI (bundled with this plugin — no separate install required).

Each action below also has a dedicated slash command, `/shipflow-<action>` (e.g.
`/shipflow-loop`, `/shipflow-status`, `/shipflow-pr`). Prefer the matching
command when the user types one; use this skill to route natural-language
requests to the same CLI calls.

## Intent → command

| If the user says... | Run |
|---|---|
| "what's my status" / "what's on my plate" | `renaiss-shipflow status --json` |
| "list issues" / "show open issues" | `renaiss-shipflow issues list --json` |
| "export issues to excel" / "issue spreadsheet" | `renaiss-shipflow issues export` — GitHub filters supported: `--state open\|closed\|all`, `--label` (repeatable), `--assignee`, `--author`, `--mention`, `--milestone`, `--search`, `--limit`, `--out <file.xlsx>` |
| "open an issue about X" / "file an issue" | `renaiss-shipflow issue create --title "X" --body "..."` |
| "I'm building X" / feature work with no issue / before a PR with no `Fixes #N` | Detect a related open issue — read `references/feature-issue-detection.md` |
| "auto-create issues" / "enable auto issue" | `renaiss-shipflow config set auto-issue true` |
| "let me work on issue 42" / "pick up #42" | `renaiss-shipflow issue work 42 --json` |
| "pick the next issue" / "what should I work on" | `renaiss-shipflow issue next --json` |
| "what needs follow-up" / "any PR comments" / "check my open PRs" | `renaiss-shipflow inbox --json` (classifies PRs by state) |
| "what features exist" / "feature map" / "system map" | `renaiss-shipflow features --json` |
| "what work is greenlit" / "standing priorities" / "show the priorities doc" | `renaiss-shipflow priorities --json` (parses `docs/PRIORITIES.md` — human-edited only; loop intake consults it, see `references/loop-reviewer.md` Mode 1) |
| "loop through issues and fix them" / "auto-fix issues" / `/shipflow-loop` | Loop mode — read `references/loop-mode.md` |
| "this issue needs a human" / "block / escalate #42" | `renaiss-shipflow issue escalate 42 --reason "..." --category <money-write\|prod-config\|security\|missing-secret\|external-dependency\|invalid>` (names an owner: `--owner` → `signoff-owner` config → issue author; `--update` edits the live 🚧 comment; the reason is linted — questions need a `**Recommendation:**`) |
| "set the default sign-off owner" | `renaiss-shipflow config set signoff-owner <github-login>` |
| "set / check the git commit email" / "deployment blocked: unmatched commit email" | `renaiss-shipflow git-identity --fix` (repo-local identity from the GitHub account; captured at `login`) |
| "I'm done with #42" / "release issue 42" | `renaiss-shipflow issue done 42` |
| "attach a screenshot to #42" / "post test evidence" | `renaiss-shipflow issue evidence 42 --pr <pr> --before <b.png…> --after <a.png…> --label "<surface>…" --caption "..."` — one labeled pair per changed surface; `--file` only for video |
| "open a PR" / "send for review" | `renaiss-shipflow pr create --json` (after committing) |
| "is PR 87 mergeable" / "can this auto-merge" | `renaiss-shipflow pr ready 87 --json` |
| "any open review comments on 87" / "external reviews" | `renaiss-shipflow pr reviews 87 --json` (unresolved threads incl. bots) |
| "resolve the review threads I fixed" | `renaiss-shipflow pr resolve 87 --thread <id>` |
| "approve PR 87" (reviewer verdict) | `renaiss-shipflow pr approve 87 --comment "..."` (refuses while threads are open) |
| "auto-merge if ready" (loop) | `renaiss-shipflow pr automerge 87 --json` (self-gates on `merge-policy`) |
| "rebase PR 87 onto its base" / "fix the conflict" | `renaiss-shipflow pr sync 87` (on the PR's branch) |
| "merge PR 87" (explicit, human-confirmed) | `renaiss-shipflow pr merge 87` (squash by default; deletes the **remote** branch) — then clean up **local** leftovers: if in a worktree, run `git worktree remove <its-worktree>`; otherwise switch to the default branch first, then `git branch -D <its-branch>` (use `-D`: a squash merge leaves the branch looking "unmerged") |
| "set the loop's merge/CI/WIP policy" | `renaiss-shipflow config set merge-policy auto-on-green` (see `config list`) |
| "run tests" | `renaiss-shipflow test` |
| "run regression" / "trigger ShipFlow tests" | `renaiss-shipflow regression --json` |
| "cut a release" / "release vX.Y.Z" | `renaiss-shipflow release --tag vX.Y.Z --json` |
| "I need to sign in" | `renaiss-shipflow login` |

## Output handling

- Pass `--json` whenever the command supports it, and parse the JSON. Never
  regex-scrape prose.
- Present results to the human **graphical-first**: a one-line verdict, then a
  table / checklist / meter (`▰▰▰▱▱ 3/5`) — not prose paragraphs. The reader
  judges in one glance. Full contract: `references/loop-mode.md` § "Message style".
- Show the `triage` payload from `issue work` to the user verbatim — it's the
  unique value of ShipFlow over plain `gh`.
- A failed signal POST (warning on stderr) still means the GitHub-side action
  succeeded. Mention the warning; do not retry.

## Guardrails

- Do NOT auto-create a branch on `issue work` — the user (or a skill they invoke)
  decides branching.
- Do NOT auto-write plan files, commit messages, or other local files from
  `issue work` output. Show the context and ask how to proceed.
- Do NOT run `renaiss-shipflow release` or `renaiss-shipflow pr merge` without
  explicit user confirmation — both trigger team-visible downstream workflows.
  (In a spawned/headless session — see below — there's no human to confirm, so
  these simply don't run: `merge-policy` governs merges via `pr automerge`, and a
  `release` is skipped. Never treat the absence of a human as approval.)

These guardrails are deliberately overridden inside Loop mode (see below), which
the user opts into explicitly.

## Spawned / headless sessions (OpenClaw, Hermes, cron)

ShipFlow is built to run unattended. When this skill is invoked inside a session
**spawned by an AI orchestrator** — OpenClaw and Hermes spawn Claude Code via ACP —
or a headless scheduler, **no human is present to answer a prompt**. Detect it at
the start of the run:

```bash
# OpenClaw sets $OPENCLAW_SESSION; $CI covers CI/cron; $SHIPFLOW_HEADLESS is an
# explicit opt-in for any other headless spawner (e.g. Hermes). Deliberately NOT
# a TTY check (`[ -t 0 ]`): Claude Code's Bash runs non-interactively even when a
# human is driving, so a TTY test false-positives and would wrongly drop the
# human-confirmation gates.
[ -n "$OPENCLAW_SESSION$CI$SHIPFLOW_HEADLESS" ] && echo "SPAWNED_SESSION: true"
```

Treat any known headless / cron / CI invocation the same way. In a spawned session:

- **Never block waiting for human confirmation.** The policy knobs (`merge-policy`,
  `require-ci`, `require-review`, `wip-limit`) are the *only* authority.
  `merge-policy: manual` still **parks** approved PRs for a human — the absence of a
  human is **not** approval; `auto-on-green` merges per its rules. Bare `pr merge`
  and `release` need explicit human confirmation a spawned session can't give, so
  they **don't happen** — park / skip, never auto-merge or release just because
  no one is watching.
- **Don't call `AskUserQuestion` or wait for input.** Anywhere this skill would
  "ask the user" / "ask how to proceed", instead proceed per policy, or
  `renaiss-shipflow issue escalate <n> --reason "..."` (labels `needs-human`) for a
  genuine human decision, and keep going. A spawned session resolves ambiguity by **escalating,
  not pausing**.
- **Report, don't ask.** End each pass with a completion report the reader judges
  at a glance — the emoji-coded count line (`✅ N merged · 🔀 N opened · ⏸ N parked ·
  🚧 N escalated`) plus a short table of decisions made / anything uncertain — not
  an interactive summary.

This is the same posture as Loop mode's continuous default; a spawned session just
makes it mandatory (the interactive "ask whether to continue" never applies).

## Loop mode

When the user explicitly asks to loop through and fix issues autonomously, read
`references/loop-mode.md` and follow it. You act as a thin **orchestrator** that
**dispatches each issue/PR to a fresh-context subagent** (Task tool) — so context
never bloats across items. Each tick (A) drives every owned PR/issue toward
`merged`, then (B) admits new work under the `wip-limit`; when the queue empties,
(C) a **bug sweep** files issues for reproduced bugs (`bug-hunt`, self-sustaining).
**Every issue (intake) and every PR (pre-merge) passes through the reviewer first**
(`require-review`) — a subagent that pulls `renaiss-shipflow features --json` (the
feature map) for a whole-system review and approves via `pr approve`. Governed by
the policy knobs in `config list` (`merge-policy` defaults to `manual`).

Loop references: `references/loop-mode.md` (full playbook), `loop-worker.md` /
`loop-reviewer.md` (subagent role contracts), `browser-testing.md` (E2E via the
**gstack headed browser** — `bin/shipflow-browser --ensure` resolves + heals it),
`bug-taxonomy.md` (severity × category + QA checklist), `qa-report.md` (health score
+ baseline), `pr-feedback.md` (resolving review threads).

## First run

Any command exits non-zero with "Not signed in." until `renaiss-shipflow login`
has run on the machine. `login` checks `gh auth status` (running `gh auth login`
interactively if needed), reads `gh auth token`, exchanges it for a ShipFlow JWT,
and caches it in `~/.config/renaissshipflow/credentials.json`.
