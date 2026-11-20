# Evidence-backed intake closure

`close` is an additive **issue-intake** verdict. It does not approve or merge a
PR. Use it only when the complete issue (acceptance and additional body scope)
has no remaining implementation slice, with a specific actually merged PR or
duplicate/superseding issue as evidence. Any remaining slice proceeds with a
brief. A closed PR without a merge is not evidence of shipped behavior.

## Gates and handoff

The CLI checks four independent gates before writing: exact `via-shipflow`
provenance; an explicit typed citation; fresh successful citation resolution;
and a complete zero-slice reviewer attestation bound to the target title/body
and updatedAt. Citation identity/state and the label are verified facts; scope
coverage remains a reviewer's semantic attestation, never CLI-verified proof.

Every extant `needs-human` gate must first clear through the existing verified
human-resolution flow. The `invalid` category also holds unanswered product,
priority and intent questions; category, prose, a supplied resolved flag or a
comment hash cannot clear them. Preserve reporter, security, production and
other signoff gates. The narrow invalid exception avoids creating a **new**
escalation for an otherwise eligible ungated zero-slice decision. Generic
invalid precedent exclusion and all existing policy defaults remain unchanged.

Finish normal claim/Judge/setup writes **before** the reviewer's final snapshot.
After a close verdict, the root reads the local decision artifact and directly
runs the close command. Do not publish the normal implementation brief, edit
Judge, relabel or refresh the claim between snapshot and close. Any intervening
write requires reading the current issue/history, repeating the complete scope
and citation assessment, and producing a newly reviewed decision. Never replace
only the timestamp/hash on an old assessment.

Return:

```json
{"target":"issue:42","verdict":"close","decisionFile":"/tmp/close-42.json","featuresImpacted":["CLI"],"findings":[]}
```

Decision file (JSON version 1; no extra fields):

```json
{
  "version": 1,
  "target": {"repo":"owner/repo","number":42,"snapshotSha256":"<64 lowercase hex>","updatedAt":"<GitHub UTC timestamp>"},
  "disposition":"shipped",
  "citation":{"kind":"pr","repo":"owner/repo","number":12},
  "finding":"Merged PR #12 implements the complete requested behavior.",
  "slice":{"remaining":[],"assessment":"All acceptance and body scope inspected.","coverage":[{"requirement":"Exact requested behavior","evidence":"Inspected source, tests and result"}]}
}
```

The snapshot is SHA256 of UTF-8 `JSON.stringify({title,body})` from the fetched
issue (null body normalized to empty string). `shipped` requires kind `pr`;
`duplicate`/`superseded` require kind `issue`. Cross-repository typed citations
are supported; self-citation and free-text URLs are not. Record every requirement
in coverage, including body scope without a checklist. The target number/repo
must match the command.

```bash
renaiss-shipflow issue close 42 --decision-file /tmp/close-42.json --repo owner/repo --agent loop-worker --json
```

The agent must match the current own claim (`--agent`, else `SHIPFLOW_AGENT`,
else hostname). GitHub and authenticated ShipFlow membership must name the same
actor. Claim collection and ownership must be readable before effects. There is
no force option. Read JSON/YAML/plain results: `status`, nullable `closed`,
`stateReason`, `gates`, `citation`, `auditCommentUrl`, attempted/verified `writes`,
`nextAction` and `exitCode`. Validation refusal exits 1; unexpected/partial
failure exits 10. A refusal performs no GitHub/ShipFlow mutations.

For a target without via-shipflow, refused/nextAction=escalate sends Mode 1 to
existing canonical invalid escalation. Use a tickless Action-needed reason,
one decision table with recommendation/evidence, and both complete replies:
`1: close → confirms closing this issue as shipped` and
`1: keep → keeps this issue open for a remaining slice`. This records a human
decision; it does not add an automatic close-on-reply handler. Never run a worker
PR for a successful close verdict; record the CLI result and continue the loop.

## Audit and recovery

The command reads all comment pages. Trust requires OWNER/MEMBER/COLLABORATOR
association, or strict REST Bot identity matching the existing configured audit
slug. The authenticated executor must own the published comment. Quoted,
fenced, untrusted or tampered records cannot justify recovery. The canonical
structured record and stage ledger must match the visible audit, with the exact
loop-close marker on its last unindented nonempty line outside code; the existing
loop marker precedes it. Shared maintainer identity cannot provide cryptographic
attribution distinct from a maintainer fabricating the same record.

One marked audit records the decision, verified citation, semantic coverage,
snapshot, executor and planned stages. The command verifies it, closes with
`completed` for shipped or `not_planned` for duplicate/superseded, verifies the
state/reason, applies `loop-closed`, clears in-progress, and releases only its own
claim. It updates the same verified stage ledger after each step. It never clears
needs-human, changes issue body/assignees, stamps duplicate as Merged or claims
transactional rollback. Failure is a truthful partial result; do not blindly
repeat close or post another audit.

Already-closed resume uses a matching trusted audit with **recorded verified
close**, unchanged original title/body, fresh state/reason/citation/gates and
claim evidence. It does not require the original updatedAt, which audit and
state writes necessarily changed. It only finishes recorded owed label/own-claim
stages and updates the same audit. Complete already-closed is a no-write success;
foreign/new claim, tampered/missing ledger, unknown close outcome or altered
content requires manual reconciliation. Never release someone else's claim.
An **open** target with any trustworthy prior close audit refuses automatic
reclosure, even under a different decision: reopening is the undo path.

## Weekly report

The deterministic **Loop-closed issues** section lists the currently closed,
loop-closed labeled cohort within the weekly UTC window, with canonical issue
links. Retained label plus human reclose can re-enter; the heading does not prove
who executed closure. The two existing AI requests/prompts remain unchanged.
The section reaches exec_summary, Details, hosted report, notification and stored
latest summary. Healthy zero is explicit; unavailable/partial collection reports
warnings and null complete count. Do not treat an incomplete collection as empty
or use this report to authorize historical bulk closure.
