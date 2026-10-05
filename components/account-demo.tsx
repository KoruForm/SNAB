"use client";
import Link from "next/link";
import { useState } from "react";
import { savePreferences } from "../lib/mock/preferences";
import { usePreferences } from "../lib/mock/use-catalogue";
import { deleteAccount, signOut, useAccount } from "../lib/supabase/use-account";
import { CodeSignIn } from "./code-sign-in";
export default function AccountDemo() {
  const account = useAccount();
  return account.configured ? <AccountSignIn account={account} /> : <DemoProfile />;
}
function AccountSignIn({ account }: { account: ReturnType<typeof useAccount> }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); } finally { setBusy(false); } }
  const signedIn = Boolean(account.userId);
  return <section className="account-page"><Link href="/me" className="back-link">← My space</Link><p className="eyebrow">A name to your Snab</p><h1>{signedIn ? "Your account." : "Make yourself at home."}</h1>
    <p className="workspace-lede">{signedIn ? "Your sales and photos are saved to your account, so you can pick them up on any device." : "Sign in with your email to keep your sales and photos on every device. We’ll email you a 6-digit code, no password needed."}</p>
    <div className="profile-avatar">{account.email?.slice(0, 1).toUpperCase() || "S"}</div>
    {account.loading && <p role="status">Checking your account…</p>}
    {!account.loading && !signedIn && <CodeSignIn />}
    {deleted && <p className="form-message success-message" role="status">Your account and everything in it has been deleted.</p>}
    {signedIn && <><p className="form-message success-message" role="status">Signed in as {account.email}.</p><button className="text-button" disabled={busy} onClick={() => void run(signOut)}>Sign out</button>
      <div className="delete-account">{!confirmDelete ? <button className="text-button" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete my account</button>
        : <div className="delete-confirm" role="alertdialog" aria-labelledby="delete-account-title"><strong id="delete-account-title">Delete your account?</strong><p>This deletes your account, your sales, their photos and addresses, and your treasure list. It can’t be undone.</p>
          <button className="button button-primary" disabled={busy} onClick={() => void run(async () => { await deleteAccount(); setConfirmDelete(false); setDeleted(true); })}>{busy ? "Deleting…" : "Yes, delete everything"}</button> <button className="button button-quiet" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep my account</button></div>}</div></>}
    <p className="field-help account-legal"><Link href="/privacy">Privacy policy</Link> · <Link href="/terms">Terms of use</Link></p>
    {error && <p className="form-message error-message" role="alert">{error}</p>}</section>;
}
function DemoProfile() {
  const { prefs, act, error } = usePreferences();
  return <section className="account-page"><Link href="/me" className="back-link">← My space</Link><p className="eyebrow">A name to your Snab</p><h1>{prefs.demoSignedIn ? "Your profile." : "Make yourself at home."}</h1><p className="workspace-lede">Try the account flow with a demo profile. Your sales and favourites stay on this device.</p><div className="profile-avatar">{prefs.name?.slice(0, 1).toUpperCase() || "S"}</div><form className="form-stack" onSubmit={e => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name") || "").trim(); if (name) act(() => savePreferences({ name, demoSignedIn: true })); }}><label>Your name<input key={prefs.name} name="name" required maxLength={60} defaultValue={prefs.name} placeholder="What should we call you?" autoComplete="given-name" /></label><button className="button button-primary">{prefs.demoSignedIn ? "Save profile" : "Continue with demo profile"}</button></form>{prefs.demoSignedIn && <><p className="form-message success-message" role="status">You’re in, {prefs.name}. Demo profile saved.</p><button className="text-button" onClick={() => act(() => savePreferences({ demoSignedIn: false }))}>Sign out of demo profile</button></>}{error && <p className="form-message error-message" role="alert">{error}</p>}</section>;
}
