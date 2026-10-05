"use client";
import { useState, type FormEvent } from "react";
import { registerInterest, validEmail } from "../lib/interest";
import { trackEvent } from "../lib/analytics";

export function InterestForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validEmail(email)) { setError("That email doesn’t look quite right. Check it and try again."); return; }
    setState("sending");
    setError("");
    try {
      await registerInterest(email, "both", "");
      setState("done");
      trackEvent("Email sign-up");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t add you to the list just now. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="soon-form soon-done" id="join" role="status">
        <h2>You’re on the list.</h2>
        <p>Keep an eye on your street. We’ll email you when it’s time.</p>
      </div>
    );
  }

  return (
    <form className="soon-form" id="join" onSubmit={submit} noValidate aria-labelledby="soon-form-heading">
      <h2 id="soon-form-heading">Be first to know.</h2>
      <label className="soon-field">
        <span>Email</span>
        <input type="email" name="email" autoComplete="email" inputMode="email" required placeholder="you@example.co.nz" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "soon-error" : undefined} />
      </label>
      {error && <p className="soon-error" id="soon-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={state === "sending"}>{state === "sending" ? "Adding you…" : "Keep me posted"} <svg className="landing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></button>
      <p className="soon-privacy">One email when it’s time. No spam, and we never share your email.</p>
    </form>
  );
}
