import { createDraft, getDraft, updateDraft } from "../drafts/storage";
import { localDateKey, validateDays, type Draft } from "../drafts/types";
import { simulateItems } from "./catalogue";
export function publicationError(draft: Draft): string | null {
  if (!draft.title.trim()) return "Give your sale a title before publishing.";
  const dates = validateDays(draft.days); if (dates) return dates;
  if (!draft.location.address.trim() || !draft.location.town.trim()) return "Add your address and town before publishing.";
  return null;
}
export async function publishDemo(id: string, title: string, description: string): Promise<Draft> {
  const draft = await getDraft(id); if (!draft) throw new Error("This draft couldn’t be found.");
  const error = publicationError({ ...draft, title, description }); if (error) throw new Error(error);
  return updateDraft(id, { title: title.trim(), description: description.trim(), status: "published", dayMode: "auto", abundance: "lots" });
}
export async function createDemoDraft(eventCode?: string): Promise<Draft> {
  const draft = await createDraft();
  return updateDraft(draft.id, { title: "Our Saturday Clearout", description: "A few things ready for a second home. Tools, games, books and a dining table. This is my demo sale.", days: [{ date: localDateKey(new Date()), starts: "08:00", finishes: "13:00" }], location: { address: "18 Demo Street", town: "Hamilton East", reveal: "sale-day" }, categories: ["Tools", "Electronics", "Furniture", "Books"], items: simulateItems().map(i => ({ ...i, confirmed: true })), highlights: simulateItems().map(i => i.label), demoScan: true, eventCode });
}
