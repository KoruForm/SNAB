"use client";
import { useEffect, useState } from "react";
import { PHOTO_BUCKET } from "../drafts/remote";
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
// Sign-in is a code typed into the page, not a link, so it works whichever browser the email opens in.
// Supabase's "Magic Link" email template must show {{ .Token }} for the code to arrive.
export async function sendSignInCode(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Accounts aren’t switched on for this site yet.");
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(error.status === 429 ? "We’ve sent a few codes already. Wait a minute, then try again." : "Couldn’t send your code. Check the address and try again.");
}
export async function verifySignInCode(email: string, code: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Accounts aren’t switched on for this site yet.");
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw new Error("That code didn’t work. Check it, or send a new one.");
}
export async function signOut(): Promise<void> {
  const { error } = (await getSupabase()?.auth.signOut()) ?? { error: null };
  if (error) throw new Error(error.message || "Couldn’t sign out. Try again.");
}
// Deletes the signed-in account and everything in it (supabase/migrations/011). Photo files are removed first,
// because stored files don't disappear with the database rows. Nothing here can be undone.
export async function deleteAccount(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Accounts aren’t switched on for this site yet.");
  const failed = "Couldn’t delete your account. Check your connection and try again.";
  const { data: sales, error } = await supabase.from("sales").select("sale_photos(storage_path)");
  if (error) throw new Error(failed);
  const paths = ((sales ?? []) as { sale_photos: { storage_path: string }[] | null }[]).flatMap(s => (s.sale_photos ?? []).map(p => p.storage_path));
  for (let i = 0; i < paths.length; i += 100) {
    const { error: removeError } = await supabase.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100));
    if (removeError) throw new Error(failed);
  }
  const { error: deleteError } = await supabase.rpc("delete_my_account");
  if (deleteError) throw new Error(failed);
  await supabase.auth.signOut({ scope: "local" });
}
