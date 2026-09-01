import dotenv from "dotenv";

dotenv.config({ path: process.env.APP_ENV_FILE ?? ".env.local", quiet: true });

const production = process.argv.includes("--production");
const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "JP_SCENTS_ADMIN_EMAIL",
  "JP_SCENTS_WHATSAPP_NUMBER",
];

const missing = required.filter((name) => !process.env[name]?.trim());
const problems = missing.map((name) => `${name} is missing.`);
const placeholderPattern = /replace-with|project_ref|password|client-domain\.example/i;

for (const name of required) {
  if (placeholderPattern.test(process.env[name] ?? "")) {
    problems.push(`${name} still contains an example placeholder.`);
  }
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (databaseUrl && !/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
  problems.push("DATABASE_URL must be a PostgreSQL connection URL.");
}
if (production && databaseUrl && /(?:localhost|127\.0\.0\.1)/.test(databaseUrl)) {
  problems.push("DATABASE_URL cannot target a local database in production.");
}

const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
if (
  publishableKey &&
  (publishableKey.startsWith("sb_secret_") || publishableKey.includes("service_role"))
) {
  problems.push(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY cannot contain a secret or service-role key.",
  );
}

for (const name of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
  const value = process.env[name];
  if (!value) continue;
  try {
    const url = new URL(value);
    if (production && url.protocol !== "https:") problems.push(`${name} must use HTTPS.`);
    if (url.pathname !== "/" || url.search || url.hash) {
      problems.push(`${name} must be an origin without a path, query, or fragment.`);
    }
  } catch {
    problems.push(`${name} must be a valid absolute URL.`);
  }
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (production && siteUrl) {
  try {
    const hostname = new URL(siteUrl).hostname;
    if (/^www\..+\.vercel\.app$/i.test(hostname)) {
      problems.push(
        "NEXT_PUBLIC_SITE_URL cannot use a guessed www.<project>.vercel.app hostname. Use the exact live public production origin.",
      );
    }
  } catch {
    // The URL-format failure is already reported above.
  }
}

const adminEmail = process.env.JP_SCENTS_ADMIN_EMAIL?.trim();
if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  problems.push("JP_SCENTS_ADMIN_EMAIL must be a valid email address.");
}

const secondaryAdminEmail = process.env.JP_SCENTS_SECONDARY_ADMIN_EMAIL?.trim();
if (secondaryAdminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondaryAdminEmail)) {
  problems.push("JP_SCENTS_SECONDARY_ADMIN_EMAIL must be a valid email address when set.");
}
if (
  adminEmail &&
  secondaryAdminEmail &&
  adminEmail.toLowerCase() === secondaryAdminEmail.toLowerCase()
) {
  problems.push("JP_SCENTS_SECONDARY_ADMIN_EMAIL must differ from JP_SCENTS_ADMIN_EMAIL.");
}

const whatsappNumber = process.env.JP_SCENTS_WHATSAPP_NUMBER?.trim();
if (whatsappNumber && !/^\d{7,15}$/.test(whatsappNumber)) {
  problems.push("JP_SCENTS_WHATSAPP_NUMBER must contain 7 to 15 digits in international format.");
}

if (production && siteUrl?.includes("localhost")) {
  problems.push("NEXT_PUBLIC_SITE_URL cannot use localhost in production.");
}

if (problems.length) {
  console.error("Environment check failed:\n- " + problems.join("\n- "));
  process.exitCode = 1;
} else {
  console.log(`${production ? "Production" : "Local"} runtime environment is configured.`);
}
