import "server-only";

export const adminConfig = {
  trustedEmail: process.env.JP_SCENTS_ADMIN_EMAIL?.trim().toLowerCase() || "jpscents23@gmail.com",
} as const;
