// Who gets an email this run, and what it says. Pure, so tests/treasure-alerts.test.ts can check it in Node.
import { treasureItems, type MatchItem } from "./treasure-match.ts";

export type Watcher = { user_id: string; email: string; treasures: string[]; alerts_from: string; stop_token: string };
export type AlertSale = {
  id: string; title: string; town: string; days: { date: string; starts: string; finishes: string }[]; categories: string[];
  highlights: string[]; items: (Partial<MatchItem> & { label: string })[] | null; owner_id: string; published_at: string; told: string[];
};
export type Work = { watchers: Watcher[]; sales: AlertSale[] };
export type Found = { sale: AlertSale; treasures: string[]; labels: string[] };
export type Alert = { watcher: Watcher; found: Found[] };

// The same highlights buyers see: the seller's items, or their typed highlights when there are none.
export function saleItems(sale: AlertSale): MatchItem[] {
  if (sale.items?.length) return sale.items.map((i, n) => ({ id: i.id || `item-${n}`, label: i.label || "", category: i.category || "", description: i.description || "", available: i.available !== false }));
  return sale.highlights.map((label, n) => ({ id: `highlight-${n}`, label, category: sale.categories[0] || "Other", description: label, available: true }));
}

// A sale is news to a buyer when it went up after they switched alerts on, isn't their own, hasn't been
// sent to them before, and has something on their list.
export function planAlerts(work: Work): Alert[] {
  return work.watchers.flatMap(watcher => {
    const found = work.sales.flatMap(sale => {
      if (sale.owner_id === watcher.user_id || sale.told.includes(watcher.user_id) || Date.parse(sale.published_at) < Date.parse(watcher.alerts_from)) return [];
      const items = saleItems(sale);
      const hits = watcher.treasures.map(treasure => ({ treasure, items: treasureItems(items, treasure) })).filter(h => h.items.length);
      return hits.length ? [{ sale, treasures: hits.map(h => h.treasure), labels: [...new Set(hits.flatMap(h => h.items.map(i => i.label)))] }] : [];
    });
    return found.length ? [{ watcher, found }] : [];
  });
}

const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function when(days: AlertSale["days"]): string {
  return days.map(d => { const date = new Date(`${d.date}T00:00:00Z`); return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}, ${d.starts.slice(0, 5)}–${d.finishes.slice(0, 5)}`; }).join(" · ");
}
function list(words: string[]): string { return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`; }

export function alertEmail(alert: Alert, site: string): { to: string; subject: string; html: string; text: string; stop: string } {
  const treasures = [...new Set(alert.found.flatMap(f => f.treasures))];
  const subject = alert.found.length === 1 ? `Spotted on SNAB: ${list(treasures)} at ${alert.found[0].sale.title || "a garage sale"}` : `Spotted on SNAB: ${list(treasures)} at ${alert.found.length} new sales`;
  const stop = `${site}/alerts/stop?t=${alert.watcher.stop_token}`;
  const sales = alert.found.map(f => ({ title: f.sale.title || "Garage sale", where: f.sale.town || "Hamilton", when: when(f.sale.days), look: list(f.labels), url: `${site}/sale/${f.sale.id}` }));
  const text = [`Something on your treasure list just turned up.`, "", ...sales.flatMap(s => [s.title, `${s.where} · ${s.when}`, `Look for: ${s.look}`, s.url, ""]),
    `Edit your treasure list: ${site}/saved`, `Stop these emails: ${stop}`].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1d1d1b">
<p style="font-size:18px;font-weight:bold">Something on your treasure list just turned up.</p>
${sales.map(s => `<div style="border:2px solid #1d1d1b;border-radius:12px;padding:14px;margin:12px 0">
<p style="margin:0;font-size:17px;font-weight:bold">${escape(s.title)}</p>
<p style="margin:4px 0;color:#555">${escape(s.where)} · ${escape(s.when)}</p>
<p style="margin:4px 0">Look for: <b>${escape(s.look)}</b></p>
<p style="margin:10px 0 0"><a href="${escape(s.url)}" style="background:#ffd23f;color:#1d1d1b;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:bold">See the sale</a></p></div>`).join("\n")}
<p style="font-size:13px;color:#555">You’re getting this because you turned on treasure alerts on SNAB. <a href="${escape(`${site}/saved`)}">Edit your list</a> · <a href="${escape(stop)}">Stop these emails</a></p></div>`;
  return { to: alert.watcher.email, subject, html, text, stop };
}
