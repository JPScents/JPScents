import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: process.env.APP_ENV_FILE ?? ".env.local", quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secretKey = (
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)?.trim();
const primaryEmail = (process.env.JP_SCENTS_ADMIN_EMAIL || "jpscents23@gmail.com")
  .trim()
  .toLowerCase();
const secondaryEmail = process.env.JP_SCENTS_SECONDARY_ADMIN_EMAIL?.trim().toLowerCase();
const trustedEmails = [...new Set([primaryEmail, secondaryEmail].filter(Boolean))];

if (!supabaseUrl || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY) are required to provision the Admin.",
  );
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return undefined;
    page += 1;
  }
}

async function grantAdminRole(user) {
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: "admin" },
    email_confirm: true,
  });
  if (error) throw error;
}

async function provisionAdmin(email) {
  const existing = await findUserByEmail(email);

  if (existing) {
    await grantAdminRole(existing);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (error) throw error;
    if (!data.user) throw new Error("Supabase did not return the provisioned Admin user.");
  }

  console.log(`Trusted Admin provisioned for ${email}.`);
}

async function main() {
  for (const email of trustedEmails) {
    await provisionAdmin(email);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown provisioning error";
  console.error(`Admin provisioning failed: ${message}`);
  process.exitCode = 1;
});
