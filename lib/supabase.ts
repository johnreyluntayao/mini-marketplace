import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export class SupabaseConfigurationError extends Error {}

function legacyEnv(name: string): string | undefined {
  // Preserve runtime reads of the old NEXT_PUBLIC_* settings across standalone builds.
  return Reflect.get(process.env, name);
}

function connect(key: string | undefined) {
  const url = process.env.SUPABASE_URL ?? legacyEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!url || !key) throw new SupabaseConfigurationError("Supabase is missing its runtime configuration.");

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { fetch: (input, options) => fetch(input, { ...options, cache: "no-store" }) },
  });
}

export function createSupabaseClient() {
  return connect(process.env.SUPABASE_PUBLISHABLE_KEY ?? legacyEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
}

export function createSupabaseServerClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key?.startsWith("sb_secret_")) throw new SupabaseConfigurationError("A Supabase server secret key is required.");
  return connect(key);
}
