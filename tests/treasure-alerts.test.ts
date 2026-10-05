import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { alertEmail, planAlerts, type AlertSale, type Watcher } from "../supabase/functions/treasure-alerts/plan.ts";
import { mergeTreasures } from "../lib/watchlist";

test("the alert function runs the same matching code as the app", () => {
  assert.equal(readFileSync("supabase/functions/treasure-alerts/treasure-match.ts", "utf8"), readFileSync("lib/treasure-match.ts", "utf8"),
    "copy lib/treasure-match.ts to supabase/functions/treasure-alerts/ and redeploy the function");
});

const watcher: Watcher = { user_id: "buyer", email: "buyer@example.nz", treasures: ["Old computers", "Record player"], alerts_from: "2026-10-05T00:00:00Z", stop_token: "11111111-1111-1111-1111-111111111111" };
function sale(id: string, patch: Partial<AlertSale> = {}): AlertSale {
  return { id, title: `Sale ${id}`, town: "Hamilton East", days: [{ date: "2026-10-10", starts: "08:00:00", finishes: "13:00:00" }], categories: ["Electronics"], highlights: [],
    items: [{ id: "pc", label: "Old PC tower", category: "Electronics", description: "Retro desktop computer" }], owner_id: "seller", published_at: "2026-10-06T00:00:00Z", told: [], ...patch };
}

test("buyers hear about new matching sales once, and never about their own or older ones", () => {
  const alerts = planAlerts({ watchers: [watcher], sales: [
    sale("new"), sale("told", { told: ["buyer"] }), sale("old", { published_at: "2026-10-01T00:00:00Z" }), sale("own", { owner_id: "buyer" }),
    sale("nothing", { items: [{ id: "chair", label: "Armchair", category: "Furniture", description: "Comfy" }] }),
    sale("gone", { items: [{ id: "pc", label: "Old PC tower", category: "Electronics", description: "", available: false }] }),
    sale("typed", { items: null, highlights: ["Record player and LPs"] }),
  ] });
  assert.equal(alerts.length, 1);
  assert.deepEqual(alerts[0].found.map(f => [f.sale.id, f.treasures, f.labels]), [["new", ["Old computers"], ["Old PC tower"]], ["typed", ["Record player"], ["Record player and LPs"]]]);
});

test("the email names the finds, links the sale and carries a stop link, with no markup from sellers", () => {
  const [alert] = planAlerts({ watchers: [watcher], sales: [sale("a1", { title: "<b>Shed</b> sale" })] });
  const email = alertEmail(alert, "https://snab.example");
  assert.equal(email.to, "buyer@example.nz");
  assert.equal(email.subject, "Spotted on SNAB: Old computers at <b>Shed</b> sale");
  assert.ok(email.html.includes("&lt;b&gt;Shed&lt;/b&gt; sale") && !email.html.includes("<b>Shed"));
  assert.ok(email.text.includes("https://snab.example/sale/a1") && email.text.includes("Sat 10 Oct, 08:00–13:00"));
  assert.equal(email.stop, "https://snab.example/alerts/stop?t=11111111-1111-1111-1111-111111111111");
});

test("signing in keeps both lists the first time, then follows the account", () => {
  assert.deepEqual(mergeTreasures(["Drill", "record player"], ["Record player", "Bikes"], false), ["Record player", "Bikes", "Drill"]);
  assert.deepEqual(mergeTreasures(["Drill"], ["Bikes"], true), ["Bikes"]);
});
