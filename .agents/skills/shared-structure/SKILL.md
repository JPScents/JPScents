---
name: shared-structure
description: Create, promote, or reorganise shared source modules by capability while preserving feature ownership and dependency direction.
---

# Shared Structure

Use when changing shared source code or promoting code into it.

## Admission

- Inspect the candidate, consumers, existing equivalents, tests, and runtime boundary.
- Confirm demonstrated cross-feature use. Possible future reuse is insufficient.
- Keep feature workflows and domain behaviour with their owner.

## Organisation

Organise shared modules by capability, for example:

```text
shared/
  auth/
  storage/
  provider-name/
  utils/
```

- Co-locate capability configuration, constants, contracts, clients, validation, and focused errors.
- Avoid loose root modules and global `config/`, `constants/`, or `types/` dumping grounds.
- Use `shared/utils/` only for generic pure leaf utilities. Utilities do not read environment variables, perform I/O, coordinate workflows, or contain domain behaviour.
- Create a barrel only when it establishes a deliberate external boundary.

## Dependencies

- Features may depend on shared capabilities.
- Shared runtime code never imports feature, seed, or test implementation.
- Do not hide feature-to-feature dependencies behind shared facades.
- Preserve server-only boundaries and keep server dependencies out of client bundles.

Preserve behaviour and public contracts. Update all affected imports, tests, mocks, and docs; search for stale paths before deleting replacements. Do not create generic managers, providers, registries, or frameworks without a current requirement. Run targeted checks, type checking, linting, broader tests, and a build as justified.
