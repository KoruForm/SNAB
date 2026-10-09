"use client";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { registerInterest, validEmail, type Interest } from "../lib/interest";
import { arrivalCampaign, trackEvent } from "../lib/analytics";

const choices: { value: Interest; label: string }[] = [
  { value: "selling", label: "I’ve got stuff to sell" },
  { value: "buying", label: "I’m here for the bargains" },
  { value: "both", label: "Both" },
];

// The page behind the letterbox flyers: it lets a few suburbs in on what the "Coming soon" teaser is about,
// then asks for sellers and buyers. Each sign-up is tagged with the flyer's campaign so suburbs can be compared.
export function Insider() {
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<Interest>("selling");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validEmail(email)) { setError("That email doesn’t look quite right. Check it and try again."); return; }
    setState("sending");
    setError("");
    try {
      const campaign = arrivalCampaign(window.location.search) || "insider";
      await registerInterest(email, interest, campaign);
      setState("done");
      trackEvent("Insider sign-up", { campaign, interest });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t add you to the list just now. Please try again.");
      setState("idle");
    }
  }

  return (
    <div className="soon-site">
      <main className="soon-main insider-main" id="main-content">
        <Image className="soon-logo" src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={1072} height={528} priority />
        <span className="watch-tape">You’re in on it</span>
        <h1 className="soon-line">Your street is having a garage sale morning.</h1>
        <div className="insider-copy">
          <p>Seen the “Coming soon” signs? This is it. SNAB puts every garage sale near you on one map, with photos of what’s for sale, so buyers can plan a Saturday morning route and sellers get a crowd.</p>
          <p>A few streets get it first. Yours is one of them.</p>
          <ul>
            <li><strong>Selling?</strong> Snap a few photos and your sale is listed free. We’ll give you a printed sign too.</li>
            <li><strong>Buying?</strong> Get the map before everyone else, and a heads up the night before.</li>
          </ul>
        </div>

        {state === "done" ? (
          <div className="soon-form soon-done" id="join" role="status">
            <h2>You’re on the inside.</h2>
            <p>{interest === "buying" ? "We’ll email you the map before the morning." : "We’ll email you how to get your sale listed and your sign."} Keep it to your street for now.</p>
          </div>
        ) : (
          <form className="soon-form" id="join" onSubmit={submit} noValidate aria-labelledby="insider-form-heading">
            <h2 id="insider-form-heading">Count me in.</h2>
            <fieldset className="insider-choices">
              <legend>I’m…</legend>
              {choices.map(choice => (
                <label key={choice.value} className="insider-choice">
                  <input type="radio" name="interest" value={choice.value} checked={interest === choice.value} onChange={() => setInterest(choice.value)} />
                  <span>{choice.label}</span>
                </label>
              ))}
            </fieldset>
            <label className="soon-field">
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" inputMode="email" required placeholder="you@example.co.nz" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "insider-error" : undefined} />
            </label>
            {error && <p className="soon-error" id="insider-error" role="alert">{error}</p>}
            <button className="button button-primary" type="submit" disabled={state === "sending"}>{state === "sending" ? "Adding you…" : "I’m in"} <svg className="landing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></button>
            <p className="soon-privacy">We only email you about SNAB sales near you, and we never share your email. <a href="/privacy">Privacy policy</a></p>
          </form>
        )}
      </main>
    </div>
  );
}
