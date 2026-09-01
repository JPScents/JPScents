import "server-only";

function firstConfigured(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function getSupabaseConfig() {
  const url = firstConfigured(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const publishableKey = firstConfigured(
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!url || !publishableKey) {
    throw new Error("Supabase URL and publishable key are required.");
  }

  return { url, publishableKey };
}
