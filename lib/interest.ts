import { getSupabase } from "./supabase/client";

export type Interest = "buying" | "selling" | "both";
export const interestOptions: { value: Interest; label: string }[] = [
  { value: "buying", label: "Finding sales" },
  { value: "selling", label: "Holding a sale" },
  { value: "both", label: "Both" },
];

export function validEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed);
}

// Adds an email to the launch list (migration 005). Signing up twice is treated as success.
export async function registerInterest(email: string, interest: Interest, suburb: string): Promise<void> {
  if (!validEmail(email)) throw new Error("That email doesn’t look quite right. Check it and try again.");
  const supabase = getSupabase();
  if (!supabase) throw new Error("Sign-ups aren’t switched on for this site yet. Please try again soon.");
  const { error } = await supabase.rpc("register_interest", { signup_email: email.trim(), signup_interest: interest, signup_suburb: suburb.trim().slice(0, 100) });
  if (error) throw new Error("Couldn’t add you to the list just now. Please try again.");
}
