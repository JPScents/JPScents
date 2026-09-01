import "server-only";

const primaryEmail =
  process.env.JP_SCENTS_ADMIN_EMAIL?.trim().toLowerCase() || "jpscents23@gmail.com";
const secondaryEmail = process.env.JP_SCENTS_SECONDARY_ADMIN_EMAIL?.trim().toLowerCase();

export const adminConfig = {
  trustedEmail: primaryEmail,
  secondaryTrustedEmail: secondaryEmail || undefined,
  trustedEmails: [...new Set([primaryEmail, secondaryEmail].filter(Boolean))] as string[],
} as const;

export function isTrustedAdminEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();
  return Boolean(normalizedEmail && adminConfig.trustedEmails.includes(normalizedEmail));
}
