// Treasure alerts: emails buyers when a newly published sale has something on their treasure list.
// Run every 15 minutes by pg_cron (supabase/migrations/009). Safe to call any time: it only sends what is
// due, and remembers each buyer and sale it has emailed so nobody hears about a sale twice.
// Secrets (Supabase → Edge Functions → Secrets): RESEND_API_KEY to send; optional ALERT_FROM (default "SNAB <noreply@snab.nz>")
// and SITE_URL (default https://snab.nz). With no RESEND_API_KEY it reports what it would send and sends nothing.
import { alertEmail, planAlerts, type Work } from "./plan.ts";

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Promise<Response>): void };
const env = (name: string) => Deno.env.get(name)?.trim() || "";

async function rpc<T>(name: string, body: object): Promise<T> {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${env("SUPABASE_URL")}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${name} failed: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

Deno.serve(async () => {
  try {
    const site = (env("SITE_URL") || "https://snab.nz").replace(/\/+$/, "");
    const resendKey = env("RESEND_API_KEY");
    const alerts = planAlerts(await rpc<Work>("treasure_alert_work", {}));
    let sent = 0;
    for (const alert of alerts) {
      const email = alertEmail(alert, site);
      if (!resendKey) continue;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env("ALERT_FROM") || "SNAB <noreply@snab.nz>", to: [email.to], subject: email.subject, html: email.html, text: email.text, headers: { "List-Unsubscribe": `<${email.stop}>` } }),
      });
      if (!res.ok) { console.error(`Resend refused an alert: ${res.status} ${await res.text()}`); continue; }
      await rpc("record_treasure_alerts", { alert_user: alert.watcher.user_id, alert_sales: alert.found.map(f => f.sale.id) });
      sent++;
    }
    return Response.json({ due: alerts.length, sent, sending: Boolean(resendKey) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Alert run failed" }, { status: 500 });
  }
});
