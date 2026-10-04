"use client";
import Link from "next/link";
import { savePreferences } from "../lib/mock/preferences";
import { usePreferences } from "../lib/mock/use-catalogue";
export default function AccountDemo() {
  const { prefs, act, error } = usePreferences();
  return <section className="account-page"><Link href="/me" className="back-link">← My space</Link><p className="eyebrow">A name to your Snab</p><h1>{prefs.demoSignedIn ? "Your profile." : "Make yourself at home."}</h1><p className="workspace-lede">Try the account flow with a demo profile. Your sales and favourites stay on this device.</p><div className="profile-avatar">{prefs.name?.slice(0, 1).toUpperCase() || "S"}</div><form className="form-stack" onSubmit={e => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name") || "").trim(); if (name) act(() => savePreferences({ name, demoSignedIn: true })); }}><label>Your name<input key={prefs.name} name="name" required maxLength={60} defaultValue={prefs.name} placeholder="What should we call you?" autoComplete="given-name" /></label><button className="button button-primary">{prefs.demoSignedIn ? "Save profile" : "Continue with demo profile"}</button></form>{prefs.demoSignedIn && <><p className="form-message success-message" role="status">You’re in, {prefs.name}. Demo profile saved.</p><button className="text-button" onClick={() => act(() => savePreferences({ demoSignedIn: false }))}>Sign out of demo profile</button></>}{error && <p className="form-message error-message" role="alert">{error}</p>}</section>;
}
