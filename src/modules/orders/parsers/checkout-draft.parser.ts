import { isSubmissionKey, parseOrderLines } from "./order-submission.parser";

export function parseCheckoutDraft(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const lines =
    Array.isArray(raw.lines) && raw.lines.length === 0 ? [] : parseOrderLines(raw.lines, 50);
  const name = typeof raw.contactName === "string" ? raw.contactName.trim() : "";
  const email = typeof raw.contactEmail === "string" ? raw.contactEmail.trim().toLowerCase() : "";
  if (
    !lines ||
    name.length > 120 ||
    email.length > 254 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return null;
  }
  if (raw.id == null) {
    return { input: { lines, contactName: name || null, contactEmail: email || null } };
  }
  const existing = parseCheckoutDraftRevision(raw);
  return existing
    ? { input: { lines, contactName: name || null, contactEmail: email || null }, existing }
    : null;
}

export function parseCheckoutDraftRevision(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const { id, version } = value as Record<string, unknown>;
  return isSubmissionKey(id) &&
    typeof version === "number" &&
    Number.isInteger(version) &&
    version >= 0 &&
    version < 2_147_483_647
    ? { id, version }
    : null;
}
