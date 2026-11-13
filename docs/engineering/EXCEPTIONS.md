# JPScents exception register

- **Inspected revision** — `cda1783b792fa392ff0f0563d948d9eaa6e07837`
- **Verified against source** — 12 November 2026
- **Approval authority** — The repository owner approved CS4 and both scoped decorative-image exceptions on 12 November 2026. The approved coding standards are the approval record. [CS4 approval](CODING_STANDARDS.md#approved-decisions) · [Exact approved scope](CODING_STANDARDS.md#approved-decorative-image-exceptions)

## Approved exceptions

The two image exceptions apply to **STD-005**, solely for `@next/next/no-img-element`. **STD-025** and **GOV-01** govern the approval. **STD-012** remains applicable to decorative alt text and accessible control names. The public route family owns both. They cover only the existing Fresh, Warm, Sweet and Woody PNGs under `public/scent-characters/`, as mapped by `scentCharacterContent`. [Image map](../../src/app/%28public%29/_lib/scent-character-content.ts) · [Governance](../architecture/ARCHITECTURE.md#4-verification-and-exceptions)

### EXC-001 Scent browsing

- **Status** — Approved, corresponding to coding standard exception EX-01 under CS4.
- **Exact scope** — The existing native `<img src={item.image} alt="">` inside the link rendered for each scent by `ScentCharacterBrowse`. Approval applies to that element and those assets. [Image and link label](../../src/app/%28public%29/_components/ScentCharacterBrowse.tsx)
- **Justification and trade-off** — Retains native rendering of existing controlled decorative artwork. The visible scent label names the link. Using the Next image component is the documented alternative and would remove the need for this lint exception. [Approved rationale](CODING_STANDARDS.md#approved-decorative-image-exceptions)
- **Verification and review** — Source inspection confirmed the element, empty alt text and label. Review eligibility on changes to the asset, image markup or image pipeline. Verify the link name and keyboard interaction in the affected UI. Keep the suppression attached to the approved element. Stage A moved the existing element and narrowed its directive. [Existing directive](../../src/app/%28public%29/_components/ScentCharacterBrowse.tsx)

### EXC-002 Scent selection

- **Status** — Approved, corresponding to coding standard exception EX-02 under CS4.
- **Exact scope** — The existing native `<img src={item.image} alt="">` inside the `ScentCharacterSelect` button. Approval applies to that element and those assets. [Button and image](../../src/app/%28public%29/help-me-choose/_components/ScentCharacterSelect.tsx) · [Visible label](../../src/app/%28public%29/help-me-choose/_components/ScentCharacterSelect.tsx)
- **Justification and trade-off** — Retains native rendering of existing controlled decorative artwork. The visible scent label names the button and `aria-pressed` communicates selection independently. Using the Next image component is the documented alternative. [Approved rationale](CODING_STANDARDS.md#approved-decorative-image-exceptions)
- **Verification and review** — Source inspection confirmed empty alt text, label and pressed state. Review eligibility on changes to the asset, image markup or image pipeline. Verify the button name, keyboard interaction and pressed state in the affected UI. Keep the suppression attached to the approved element. Stage A moved the existing element and narrowed its directive. [Existing directive](../../src/app/%28public%29/help-me-choose/_components/ScentCharacterSelect.tsx)

### EXC-003 Dependency tooling for PR #1

- **Status** — Approved by the repository owner on 12 November 2026 under milestone v3 AC3 and GOV-01. [Owner decision](https://github.com/JPScents/JPScents/pull/1#issuecomment-6832060892)
- **Scope** — The residual, noncritical npm audit findings recorded in PR #1 for this release only, on `package-lock.json` SHA-256 `dc545fd026db4a7321e7ac101890fc309890b262ad369b302cc50269fe4dd321`. [Audit and exposure evidence](https://github.com/JPScents/JPScents/pull/1#issuecomment-6832032706)
- **Compensating evidence** — Both critical fixes remain applied. The locked install and isolated CI remain required. None of the audit-listed packages appeared in the 33 inspected Next.js production dependency trace manifests. Install, build and developer tooling still carry exposure.
- **Review condition** — The repository owner reassesses before the next release, or sooner if the lockfile changes, a relevant patch ships, or an affected package enters a deployed path.

## Suppressions outside the approval

The two current module-level directives cover the remainder of each file for the named rule. Both files currently contain one native image element in source. The directive scope is still broader than the approved elements and could suppress a future use. This is recorded as GAP-006. The approved exceptions cover the elements only. The source scan found no further ESLint disable directives or TypeScript suppression comments in the inspected authored TypeScript and MJS paths. [Findings register](COMPLIANCE_BASELINE.md#findings-register)

## Proposed exceptions awaiting approval

None. Pending architecture work and existing debt are tracked in the [compliance baseline](COMPLIANCE_BASELINE.md#findings-register).

## Recording, review and supersession

1. Use the next stable `EXC-NNN` identifier. Record the status, exact rule IDs, file and symbol scope, rationale, alternatives, trade-off, compensating verification, responsible feature or role, and the expiry or review condition required by GOV-01. Link the evidence and related finding.
2. Record a new request as **PROPOSED — AWAITING APPROVAL**. Mark it **Approved** only when explicit approval is evidenced. Apply the approved scope to any corresponding suppression or check. A request to expand it follows the same approval path.
3. Reassess at the recorded condition. When a deviation is removed or replaced, preserve the record, mark it closed or superseded, and link the verification or replacement record. Keep existing feature variations that already satisfy the contract in the compliance baseline. [Architecture governance](../architecture/ARCHITECTURE.md#4-verification-and-exceptions) · [STD-025](CODING_STANDARDS.md#mandatory-conventions)
