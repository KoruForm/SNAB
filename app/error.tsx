"use client";
import { useEffect } from "react";
import OopsPage from "../components/oops-page";
import { trackEvent } from "../lib/analytics";

// Something broke while showing a page. Shown in place of a blank screen, and counted in Umami (event
// "Page error") so a problem shows up in the stats even when nobody reports it.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { trackEvent("Page error", { path: window.location.pathname, message: (error.message || "unknown").slice(0, 120) }); }, [error]);
  return <OopsPage title="Well, that didn’t work." action={<button className="button button-primary" onClick={reset}>Try again</button>}>Something went wrong on our side. Try again, or head back to the sales.</OopsPage>;
}
