"use client";
import { useState } from "react";
import { sendSignInCode, verifySignInCode } from "../lib/supabase/use-account";

// Email, then the 6-digit code we send. Used on the account page and wherever the treasure list asks for an email.
export function CodeSignIn({ sendLabel = "Email me a sign-in code", onSignedIn }: { sendLabel?: string; onSignedIn?: () => void }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); } finally { setBusy(false); } }
  const send = (to: string) => run(async () => { await sendSignInCode(to); setSentTo(to); });
  return <div className="code-sign-in">
    {!sentTo ? <form className="form-stack" onSubmit={e => { e.preventDefault(); const to = email.trim(); if (to) void send(to); }}>
      <label>Email<input name="email" type="email" required maxLength={254} placeholder="you@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <button className="button button-primary" disabled={busy}>{busy ? "Sending…" : sendLabel}</button>
      <p className="field-help">By signing in you agree to the <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.</p>
    </form> : <form className="form-stack" onSubmit={e => { e.preventDefault(); const code = String(new FormData(e.currentTarget).get("code") || "").replace(/\D/g, ""); if (code) void run(async () => { await verifySignInCode(sentTo, code); onSignedIn?.(); }); }}>
      <p className="form-message success-message" role="status">We’ve sent a code to {sentTo}. It can take a minute to arrive.</p>
      <label>Your code<input name="code" className="code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" maxLength={12} required placeholder="123456" autoFocus /></label>
      <button className="button button-primary" disabled={busy}>{busy ? "Checking…" : "Sign in"}</button>
      <p className="code-sign-in-again"><button type="button" className="text-button" disabled={busy} onClick={() => void send(sentTo)}>Send a new code</button> · <button type="button" className="text-button" disabled={busy} onClick={() => { setSentTo(""); setError(""); }}>Use a different email</button></p>
    </form>}
    {error && <p className="form-message error-message" role="alert">{error}</p>}
  </div>;
}
