"use client";
import { useState, type FormEvent } from "react";
import { interestOptions, registerInterest, validEmail, type Interest } from "../lib/interest";

export function InterestForm() {
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<Interest>("both");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validEmail(email)) { setError("That email doesn’t look quite right. Check it and try again."); return; }
    setState("sending");
    setError("");
    try {
      await registerInterest(email, interest, suburb);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t add you to the list just now. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="soon-form soon-done" id="join" role="status">
        <p className="landing-eyebrow"><span className="landing-spark" aria-hidden="true">✳</span> You’re on the list</p>
        <h2>Nice one. <span className="landing-underline">See you soon.</span></h2>
        <p>We’ll email you when SNAB opens in Hamilton. Time to start eyeing up that garage.</p>
      </div>
    );
  }

  return (
    <form className="soon-form" id="join" onSubmit={submit} noValidate aria-labelledby="soon-form-heading">
      <h2 id="soon-form-heading">Be first to know.</h2>
      <p className="soon-form-lede">Get one email when SNAB opens near you.</p>
      <label className="soon-field">
        <span>Email</span>
        <input type="email" name="email" autoComplete="email" inputMode="email" required placeholder="you@example.co.nz" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "soon-error" : undefined} />
      </label>
      <fieldset className="soon-choice">
        <legend>I’m keen on</legend>
        <div>{interestOptions.map(option => (
          <label key={option.value}><input type="radio" name="interest" value={option.value} checked={interest === option.value} onChange={() => setInterest(option.value)} /><span>{option.label}</span></label>
        ))}</div>
      </fieldset>
      <label className="soon-field">
        <span>Suburb <em>(optional)</em></span>
        <input type="text" name="suburb" autoComplete="address-level3" maxLength={100} placeholder="e.g. Hamilton East" value={suburb} onChange={e => setSuburb(e.target.value)} />
      </label>
      {error && <p className="soon-error" id="soon-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={state === "sending"}>{state === "sending" ? "Adding you…" : "Keep me posted"} <svg className="landing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></button>
      <p className="soon-privacy">Just launch news. No spam, and we never share your email.</p>
    </form>
  );
}
