import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Both values are public (the anon key is safe in the browser; row-level security does the guarding).
// Next.js inlines NEXT_PUBLIC_ variables at build time, so they must be set before `npm run build`.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let client: SupabaseClient | undefined;

export function supabaseConfigured(): boolean { return Boolean(url && anonKey); }
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey || typeof window === "undefined") return null;
  client ??= createClient(url, anonKey, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } });
  return client;
}
// The signed-in account, read from the stored session. Access control itself is enforced by RLS.
export async function currentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
