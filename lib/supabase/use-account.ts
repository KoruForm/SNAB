"use client";
import { useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "./client";

export type Account = { configured: boolean; loading: boolean; email: string | null; userId: string | null };
export function useAccount(): Account {
  const [state, setState] = useState<Account>({ configured: supabaseConfigured(), loading: supabaseConfigured(), email: null, userId: null });
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ configured: true, loading: false, email: session?.user.email ?? null, userId: session?.user.id ?? null }));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}
export async function sendSignInLink(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Accounts aren’t switched on for this site yet.");
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/account` } });
  if (error) throw new Error(error.message || "Couldn’t send the sign-in link. Check the address and try again.");
}
export async function signOut(): Promise<void> {
  const { error } = (await getSupabase()?.auth.signOut()) ?? { error: null };
  if (error) throw new Error(error.message || "Couldn’t sign out. Try again.");
}
