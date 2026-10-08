"use client";
import { useEffect } from "react";
import "./globals.css";
import OopsPage from "../components/oops-page";
import { trackEvent } from "../lib/analytics";

// Last line of defence: the whole layout failed, so this brings its own <html>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { trackEvent("Page error", { path: window.location.pathname, message: (error.message || "unknown").slice(0, 120) }); }, [error]);
  return <html lang="en-NZ"><body><OopsPage title="Well, that didn’t work." action={<button className="button button-primary" onClick={reset}>Try again</button>}>Something went wrong on our side. Try again, or head back to the sales.</OopsPage></body></html>;
}
