# Engineering change control

Use this process when a proposed change alters an approved requirement or the boundary that enforces it. It implements GOV-01 and STD-025 using the existing ADR index, exception register, and milestone and review records. The approved architecture and standards govern until an explicit decision authorizes a change within a recorded scope. [Architecture](../architecture/ARCHITECTURE.md#4-verification-and-exceptions) · [Coding standards](CODING_STANDARDS.md#mandatory-conventions) · [ADR lifecycle](../architecture/adr/README.md#naming-and-lifecycle)

## Mandatory architecture approval contract

**Owner instruction recorded 13 November 2026:** “JPScents — Integrate Mandatory ADR Approval into Milestone Workflows”, supplied in the orchestrator conversation `01a1cec3-03ca-7393-bc1c-2947b3f43759`, explicitly requires owner approval of every new or modified architectural decision before affected implementation. This authorises this workflow update, not new commerce decisions. This section is the canonical approval procedure; milestone and agent instructions route here rather than create a second decision register.

- The Orchestrator MUST classify architectural impact during planning/authoring and on task assignment/resume: **No architectural change**, **Uses an existing approved architectural decision**, or **Requires a new architectural decision or modification to an approved one**. Record rationale and applicable rule/ADR IDs for each relevant task in the existing milestone/task/PR artifact.
- A new ownership, dependency, runtime, provider, trust, persistence, transaction, consequential lifecycle or verification-boundary decision MUST have a proposed ADR and explicit **repository owner** approval. Silence, a plan/status label, existing code, tests, review PASS, execution instructions or merge approval MUST NOT be inferred to approve a new architecture. Existing explicit approval of the exact decision may be cited; a general feature request is insufficient. Verify scope/version/conditions; ambiguity remains blocked, not retroactively approved.
- The Orchestrator MUST own identification, the owner brief, approval evidence, task dependency status and instruction propagation. Every dependent implementation task MUST reference an Accepted ADR whose approval covers its scope. A proposal, missing approval evidence, unresolved scope, or inconsistent adoption artifacts means **BLOCKED** for that task and its dependents. Independent authorised work may continue; whole-milestone activation MUST NOT bypass these task gates.
- The Execution Agent MUST independently check the mapping before affected edits. On an unforeseen decision, immediately stop affected implementation, preserve existing work, mark it BLOCKED and notify the Orchestrator with evidence, affected tasks/rules and the proposed choice. It MUST NOT choose and implement the architecture first. Read-only investigation, proposal preparation and independent authorised tasks remain permitted. If the Orchestrator is unavailable, record the exact handoff and keep the dependent work blocked.
- The independent reviewer MUST compare the actual diff with the Accepted ADR, exact approval evidence and scope, not just its status string or the implementation summary. An unresolved architectural decision prevents **PASS**, **APPROVE**, **READY** and **READY FOR MERGE** for the affected candidate. Missing approval artifacts are BLOCKED; a required owner decision is ESCALATE, with dependent tasks BLOCKED. Ordinary implementation defects retain CHANGES REQUIRED. Review cannot grant architecture approval.
- **Architecture approval and merge approval are separate owner gates.** Architecture approval precedes affected implementation; human merge authority follows implementation, verification and independent review. Neither substitutes for the other or grants production/hosted-setting authority.

Routine naming, local helpers, query implementation and bug fixes within approved responsibilities do not need new ADRs merely because an agent makes a technical choice. The impact classification must explain this distinction. A scoped exception follows its existing register; it MUST NOT disguise a new architectural decision as an exception.

### Six-part owner decision brief

The Orchestrator MUST present this concise brief, linking the full proposed ADR. Reserve the next available ID through the existing index, coordinating concurrent proposals. The owner can **approve, revise or reject** it.

```text
1. Decision title / proposed ADR identifier / proposal version or digest:
2. Why required / source evidence:
3. Recommended approach:
4. Alternatives / significant trade-offs:
5. Affected milestone, task IDs and architectural rule IDs:
6. Exactly blocked implementation and dependent tasks; independent work allowed:
Owner response requested: Approve | Revise | Reject
```

### Approval evidence and resume checklist

In the ADR and relevant milestone/task/PR artifact, record decision ID, proposal version/digest, actual owner disposition, exact approved scope/conditions, decision date when evidenced, and a retrievable message/PR/comment reference plus a concise quotation. Keep the reference/quotation when a conversation is inaccessible to another agent. An agent summary, ACK or changed status alone is not approval. Do not fabricate a timestamp or authority. Rejected/withdrawn proposals stay unapproved with their disposition; material revisions require a decision on the revised scope.

After approval, the Orchestrator MUST verify all of the following before releasing dependent implementation:

1. The ADR is Accepted with owner approval evidence; a scoped successor links any superseded predecessor.
2. Affected architecture/standards and stable rule mappings agree with the approved decision.
3. The existing milestone and implementation tasks cite the ADR, scope/conditions and exact dependencies through the approved contract-revision path; scope and review budget are not silently changed.
4. Applicable verification requirements and enforcement specifications are aligned. Distinguish already operating checks from implementation work assigned to the approved task; never weaken a check or describe planned tooling as operational.
5. Revised instructions are sent to the Execution Agent through the existing channel. Record acknowledgement of the ADR/version and constraints before resuming; if communication is unavailable, store the exact handoff and mark acknowledgement pending/BLOCKED for the affected assignment.
6. Recheck the candidate/task mapping on resume and before review. Resume only consistent, authorised work; approval does not imply implementation, verification or merge readiness.

Preserve all existing evidence, independent review and owner-action requirements below. Enforcement here is an explicit instruction/review gate; existing scripts do not authenticate human ADR approval.

## When to request a decision

| Change                                                                                                                                                                    | Required record and authority                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Move a responsibility, add a cross-feature dependency, change a runtime or trust boundary, or transfer data or transaction ownership                                      | Propose an ADR and obtain explicit repository owner approval. Include the old and new ownership and the invariants affected.                                                                                                                                                                       |
| Change a security, privacy, data-consistency or consequential product invariant, or choose a consequential trade-off without an approved precedent                        | Escalate the decision and cite the exact rule, ADR and affected acceptance criteria. Use an ADR for a lasting architectural choice. Follow the existing authorization path for destructive or irreversible work.                                                                                   |
| Add, retire, or change a coding rule or mandatory check                                                                                                                   | Propose a revision to the owning standard or verification contract. Show the coverage, failures the change would admit, and enforcement implications. Use an ADR when the change also alters an architectural decision. Hosted settings and deployment require the applicable owner authorization. |
| Add or extend a deviation, suppression or waiver                                                                                                                          | Use the exception register with exact scope, compensating evidence and an expiry or review condition. Obtain explicit approval before introduction or expansion.                                                                                                                                   |
| Implement an accepted design, fix a bug within the contract, tighten an overbroad implementation of an existing rule, or repair a check to enforce its approved semantics | Use ordinary authorized delivery. Cite the existing rule and keep its evidence requirements. A new ADR is unnecessary unless the proposed remedy changes the approved contract.                                                                                                                    |

## Proposal and owner brief

Create a proposal in the owning record or the existing milestone or PR decision thread. Use **PROPOSED — AWAITING APPROVAL** while the decision is open. Link the complete proposal from the short owner brief. Pause the conflicting part and continue independent work that remains authorized.

```text
Status — PROPOSED — AWAITING APPROVAL
Title, scope and proposal/version —
Current rule IDs, ADRs, exception IDs and acceptance criteria —
Problem, evidence and inspected revision —
Proposed change and recommended option —
Alternatives, including keeping the current rule, with trade-offs —
Affected features, callers, ownership and security/privacy boundaries —
Migration, data integrity and backwards-compatibility risks —
Tests and real-boundary evidence required, including failure cases —
Checks, enforcement and instructions affected —
Rollout, compatibility window, recovery/rollback and responsible role —
Requested owner decision and exact approval scope —
Approval evidence, approver authority and decision date — pending
```

Keep the owner brief to the problem and evidence, recommended choice, viable alternative and material consequence, and exact decision requested. If adopting the change needs separate permission for a migration, hosted setting or release, identify that permission and the point where it applies.

## Decision and adoption states

Record these dimensions separately in the decision and implementation handoff. Each status applies to a stated scope and, where relevant, an exact revision and boundary.

| State                         | Entry and evidence                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PROPOSED**                  | A documented request awaits an explicit decision. Existing contracts still apply.                                                                                                                                                                                                                                       |
| **REJECTED** or **WITHDRAWN** | Record the actual disposition and its reference in the proposal history. The request remains unapproved. A revised proposal requires its own decision.                                                                                                                                                                  |
| **APPROVED**                  | An explicit owner decision identifies the architectural proposal/version, approved scope and any conditions. Non-architectural delegated authority must remain separately evidenced. Cite the decision and record its date only when evidenced. This is `Accepted` for an ADR and `Approved` in the exception register. |
| **IMPLEMENTED**               | Code or authoritative documentation reflects the accepted scope. Record the candidate and the artifacts updated. A staged rollout can still have pending or blocked adoption.                                                                                                                                           |
| **VERIFIED**                  | Required checks ran at the applicable boundary on the exact candidate. Record commands, exits, limitations and a separate reviewer verdict. Missing, stale, partial or malformed evidence is **BLOCKED**. Actual failures stay **FAIL** until corrected and rechecked.                                                  |
| **ENFORCED**                  | An active check or reviewed gate demonstrably operates at the stated boundary. Record its trigger and a pass/reject example. Local, CI, hosted merge and promotion gates each need their own evidence. A configured gate with no operational proof is **CONFIGURED BUT UNVERIFIED**.                                    |

Silence, a green test, a reviewer PASS, an existing suppression and implementation convenience carry no approval. A draft or disputed approval stays PROPOSED. A denied request does not become an Accepted ADR. Preserve the disposition in history. An approved design with missing prerequisites remains approved with adoption blocked. Implementation, verification and enforcement evidence do not grant merge or deployment authority.

## Record the decision and update its dependencies

Use the existing ADR index and next four-digit ID for a new architectural decision. When a later decision materially replaces an earlier one, mark the predecessor **Superseded** in the affected scope and link both records. Keep the predecessor's original rationale, approval and historical evidence. Record a supersession date only when supported by the decision. Preserve stable rule IDs for the same obligation. Retire and replace an ID if its meaning changes materially, with traceable links and mappings for outstanding findings, checks and exceptions. [ADR lifecycle](../architecture/adr/README.md#naming-and-lifecycle)

After explicit approval, reconcile the affected artifacts in this order. Include any applicability or sequencing constraint in the approved rollout. Independent review checks the complete change before it is reported as adopted.

1. Record the accepted decision and approval reference. Update the owning architecture or standards, rule IDs and ADR links to reflect the approved scope.
2. Reconcile exact exceptions and baseline findings. Preserve history and distinguish accepted pending work, existing debt, and newly introduced problems.
3. Update the enforcement matrix and affected deterministic checks. Add compliant and violating fixtures for a mechanical rule. Identify checks that require an independent reviewer or real boundary.
4. Align tests and acceptance evidence with the accepted invariant. Exercise applicable migrations, rollback, concurrency, authorization, browser or provider boundaries. Keep any inapplicable boundary and rationale visible.
5. Update affected agent routing, milestone acceptance criteria and review prompts through the existing approved revision path. Keep the milestone contract, review budget and old evidence in their existing records.
6. Update CI, required checks or promotion evidence only within the approved scope and hosting authority. Verify activation independently of configuration. Run the required checks, bind their results to the exact candidate and obtain a separate review before declaring adoption complete. [Enforcement matrix](ENFORCEMENT_MATRIX.md) · [Verification contract](VERIFICATION_CONTRACT.md) · [Milestone integration](MILESTONE_INTEGRATION.md) · [Review protocol](REVIEW_PROTOCOL.md)

## Exceptions and ongoing maintenance

Record the exact rule, file, symbol, element, asset or other bounded scope, rationale, alternatives, trade-off, approval reference, responsible role, compensating verification and review trigger. Add expiry or a removal plan where applicable. A path-wide directive cannot use an element-level approval to cover another element. When the trigger is reached or the exception expires, stop relying on its old scope until removal or an evidenced renewal. Preserve the closed or superseded record and the verification of removal. Baseline entries record known debt. Expanding a baseline requires an explicit decision and matching tests. [Exception lifecycle](EXCEPTIONS.md#recording-review-and-supersession) · [Baseline findings](COMPLIANCE_BASELINE.md#findings-register)

On an intelligence refresh, failed check, reviewer finding or changed requirement, compare current canonical files with the implementation and actual enforcement. Fix implementation drift under the existing requirement when possible. Propose a decision when the requirement or its verification needs to change. Review any new rule for a demonstrable failure mode and a mechanical or human verification method before asking for approval. The existing milestone flow owns implementation, correction and delivery. A change to reviewed code invalidates affected evidence and the verdict until rechecked on the new candidate. [Milestone evidence](MILESTONE_INTEGRATION.md#freeze-the-candidate-and-validate-evidence)

## Isolated decision dry-run

The tabletop used hypothetical handoffs against the current ADRs and exception register. It created no owner decision or live ADR. The denied path below was an input to the exercise only.

| Handoff                                                                                                                                             | Decision reached in the exercise                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Propose moving the checkout transaction from Orders to Catalogue. The proposed owner change conflicts with ARC-10 and INV-05 under D2 and ADR-0002. | **PROPOSED** with a blocking owner decision. A passing check would leave this state unchanged. Record rollback, final-unit stock, cancellation, customer participation, persisted-data and compatibility impacts. Recommend retaining Orders as transaction owner unless the proposal supplies a concrete advantage and preserves the atomic workflow. [D2](../architecture/ARCHITECTURE.md#approved-decisions) · [ADR-0002](../architecture/adr/0002-order-transactions-and-inventory-consistency.md) |
| Exercise the same request with a hypothetical denial.                                                                                               | Record a rejected proposal disposition in the scenario. Keep ADR-0002 and the current rule IDs operative. An implementer can continue work under D2. No Accepted successor, ownership change or exception follows.                                                                                                                                                                                                                                                                                     |
| Trace the dependency updates a later, genuine scoped approval would require.                                                                        | Record the successor ADR and affected rules first, then reconcile GAP-002 and any exception scope. Update the enforcement matrix, required transaction and concurrency tests, milestone and review criteria, and applicable CI evidence. Require exact-candidate verification and independent review. This describes the conditional adoption plan. Approval and enforcement were not simulated as successful.                                                                                         |
| Request a second native image under EXC-001 using the existing file-level suppression.                                                              | **ESCALATE** under GOV-01 and STD-025. The second image is outside EXC-001 and would worsen GAP-006. Use the approved image approach for the second element, or request a separate exact-scope exception before implementation. The existing checker fixtures pass the approved element and reject expansion or restoration after baseline removal. [Scope](EXCEPTIONS.md#approved-exceptions) · [Checker fixtures](../../tests/architecture/feature-structure.test.ts#L191)                           |

The checker exercises scope mechanically. The approval and denial decisions above were tabletop evaluations. See the handoff for executed commands and the remaining enforcement limits. [Setup status](ENGINEERING_SETUP_STATUS.md#task-16-validation)
