---
name: independent-review
description: Independently review a frozen JPScents change against approved contracts, acceptance criteria and verification evidence. Use for a separate review assignment.
---

# Independent review

Read the [review protocol](../../../docs/engineering/REVIEW_PROTOCOL.md) for the handoff, finding fields, verdict criteria and escalation authority.

Apply the [architecture approval gate](../../../docs/engineering/CHANGE_CONTROL.md#mandatory-architecture-approval-contract): independently map actual architectural changes to Accepted ADRs and exact owner evidence, including scope/version, propagated instructions and execution acknowledgement. Unresolved new decisions require ESCALATE with dependent tasks BLOCKED; missing approval evidence is BLOCKED. Neither permits PASS/APPROVE/READY/READY FOR MERGE. Review cannot grant architecture or merge approval.

1. Confirm that you are a separate reviewer with no implementation role on this candidate. Verify the repository, base, target revision or frozen diff, and acceptance criteria. Return **BLOCKED** if you cannot establish the candidate or independently review it.
2. Read the relevant [architecture](../../../docs/architecture/ARCHITECTURE.md), [coding standards](../../../docs/engineering/CODING_STANDARDS.md) and [accepted ADRs](../../../docs/architecture/adr/README.md). Inspect the actual diff and follow affected entry points, dependencies and tests. Treat the implementer's summary as a claim to check.
3. Compare relevant issues to the [compliance baseline](../../../docs/engineering/COMPLIANCE_BASELINE.md) and [approved exceptions](../../../docs/engineering/EXCEPTIONS.md). Record what the candidate introduces or worsens. Preserve pending decisions and scoped exceptions as context.
4. Inspect the actual check results under the [verification contract](../../../docs/engineering/VERIFICATION_CONTRACT.md). Match them to the candidate and required boundary. Run only useful, authorized checks that can safely resolve gaps. Record missing evidence and its effect on the verdict.
5. Return the structured artifact from the protocol. Retain stable finding IDs, cite exact evidence and send routine corrections back to the implementer. Escalate consequential decisions to the owner. Leave source, approvals, merge and deployment operations to their authorized owners.
