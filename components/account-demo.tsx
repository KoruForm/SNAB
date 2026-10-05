"use client";
import Link from "next/link";
import { useState } from "react";
import { savePreferences } from "../lib/mock/preferences";
import { usePreferences } from "../lib/mock/use-catalogue";
import { signOut, useAccount } from "../lib/supabase/use-account";
import { CodeSignIn } from "./code-sign-in";
export default function AccountDemo() {
  const account = useAccount();
  return account.configured ? <AccountSignIn account={account} /> : <DemoProfile />;
}
function AccountSignIn({ account }: { account: ReturnType<typeof useAccount> }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); } finally { setBusy(false); } }
  const signedIn = Boolean(account.userId);
  return <section className="account-page"><Link href="/me" className="back-link">← My space</Link><p className="eyebrow">A name to your Snab</p><h1>{signedIn ? "Your account." : "Make yourself at home."}</h1>
    <p className="workspace-lede">{signedIn ? "Your sales and photos are saved to your account, so you can pick them up on any device." : "Sign in with your email to keep your sales and photos on every device. We’ll email you a 6-digit code, no password needed."}</p>
    <div className="profile-avatar">{account.email?.slice(0, 1).toUpperCase() || "S"}</div>
    {account.loading && <p role="status">Checking your account…</p>}
    {!account.loading && !signedIn && <CodeSignIn />}
    {signedIn && <><p className="form-message success-message" role="status">Signed in as {account.email}.</p><button className="text-button" disabled={busy} onClick={() => void run(signOut)}>Sign out</button></>}
    {error && <p className="form-message error-message" role="alert">{error}</p>}</section>;
}
function DemoProfile() {
  const { prefs, act, error } = usePreferences();
  return <section className="account-page"><Link href="/me" className="back-link">← My space</Link><p className="eyebrow">A name to your Snab</p><h1>{prefs.demoSignedIn ? "Your profile." : "Make yourself at home."}</h1><p className="workspace-lede">Try the account flow with a demo profile. Your sales and favourites stay on this device.</p><div className="profile-avatar">{prefs.name?.slice(0, 1).toUpperCase() || "S"}</div><form className="form-stack" onSubmit={e => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name") || "").trim(); if (name) act(() => savePreferences({ name, demoSignedIn: true })); }}><label>Your name<input key={prefs.name} name="name" required maxLength={60} defaultValue={prefs.name} placeholder="What should we call you?" autoComplete="given-name" /></label><button className="button button-primary">{prefs.demoSignedIn ? "Save profile" : "Continue with demo profile"}</button></form>{prefs.demoSignedIn && <><p className="form-message success-message" role="status">You’re in, {prefs.name}. Demo profile saved.</p><button className="text-button" onClick={() => act(() => savePreferences({ demoSignedIn: false }))}>Sign out of demo profile</button></>}{error && <p className="form-message error-message" role="alert">{error}</p>}</section>;
}
