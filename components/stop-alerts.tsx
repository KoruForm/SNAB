"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "../lib/supabase/client";

// The "stop these emails" link in treasure alerts. Works without signing in; the token is the permission.
export default function StopAlerts() {
  const token = useSearchParams().get("t") || "";
  const [state, setState] = useState<"ready" | "busy" | "done" | "error">("ready");
  async function stop() {
    const supabase = getSupabase();
    if (!supabase || !/^[0-9a-f-]{36}$/i.test(token)) { setState("error"); return; }
    setState("busy");
    const { error } = await supabase.rpc("stop_treasure_alerts", { token });
    setState(error ? "error" : "done");
  }
  return <main className="stop-alerts">
    <h1>{state === "done" ? "Done. No more alerts." : "Stop treasure alerts?"}</h1>
    {state === "done" ? <p>We won’t email you about new sales. Your treasure list is still saved, and you can turn alerts back on from it any time.</p>
      : <><p>We’ll stop emailing you when a new sale has something on your treasure list.</p>
        <button className="button button-primary" disabled={state === "busy"} onClick={() => void stop()}>{state === "busy" ? "Stopping…" : "Stop the emails"}</button></>}
    {state === "error" && <p role="alert">That link didn’t work. Sign in and turn alerts off from your treasure list instead.</p>}
    <p><Link href="/saved">Go to your treasure list →</Link></p>
  </main>;
}
