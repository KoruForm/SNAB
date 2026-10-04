import type { SaleDay } from "../drafts/types";
import type { BuyerSale } from "./catalogue";
import { fitBlock, shortTitle, signText, SIGN_FONT, type Measure } from "./sign";

// Josh's social templates (design/social/sale-post.svg, sale-story.svg) are split into three files in
// public/social: the background, the torn-edge mask for the photo, and his sample photo for sales without one.
// The seller's photo, title, days, address and categories are drawn on top. All measurements are in px.
export type SocialKind = "post" | "story";
export type SocialLine = { text: string; size: number; x: number; y: number; colour: "ink" | "paper"; align: "center" | "left" };

type Zone = { top: number; bottom: number; left: number; width: number };
type Spec = { width: number; height: number; photoHeight: number; title: Zone & { size: number; min: number }; band: Zone & { name: number; date: number }; info: Zone & { address: number; min: number; tags: number } };

export const SOCIAL: Record<SocialKind, Spec> = {
  // 1080 × 1350 feed post: title on the paper under "GARAGE SALE", days on the orange band, address and tags beside the logo.
  post: { width: 1080, height: 1350, photoHeight: 612,
    title: { top: 655, bottom: 798, left: 40, width: 1000, size: 50, min: 34 },
    band: { top: 818, bottom: 1022, left: 30, width: 1020, name: 58, date: 44 },
    info: { top: 1068, bottom: 1300, left: 45, width: 630, address: 56, min: 34, tags: 38 } },
  // 1080 × 1920 story: same order, more room. The bottom orange strip stays empty for Instagram's link sticker.
  story: { width: 1080, height: 1920, photoHeight: 738,
    title: { top: 780, bottom: 1028, left: 40, width: 1000, size: 62, min: 42 },
    band: { top: 1050, bottom: 1286, left: 30, width: 1020, name: 66, date: 50 },
    info: { top: 1340, bottom: 1620, left: 45, width: 650, address: 64, min: 40, tags: 44 } },
};
const CAP = 1520 / 2048, LEADING = 1.1, DAY_LEADING = 1.22;
const DAY_BOOST: Record<number, number> = { 1: 1.3, 2: 1.15 };
const COLOURS = { ink: "rgb(13,13,13)", paper: "rgb(246,242,231)" };

function clock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h)) return time;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "AM" : "PM"}`;
}

export function socialDay(day: SaleDay): { name: string; date: string; time: string } {
  const time = `${clock(day.starts)} - ${clock(day.finishes)}`;
  if (!day.date) return { name: "DATE", date: "TBC", time };
  const d = new Date(`${day.date}T12:00:00Z`);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NZ", { ...o, timeZone: "UTC" }).format(d);
  return { name: part({ weekday: "long" }).toUpperCase(), date: `${part({ day: "numeric" })} ${part({ month: "short" }).replace(".", "")}`.toUpperCase(), time };
}

export function socialTags(sale: BuyerSale): string[] {
  return sale.categories.filter(c => c !== "Other").slice(0, 3).map(c => c.toUpperCase());
}

const blockHeight = (count: number, size: number) => (count - 1) * size * LEADING + size * CAP;

export function layoutSocial(sale: BuyerSale, kind: SocialKind, measure: Measure): SocialLine[] {
  const spec = SOCIAL[kind], lines: SocialLine[] = [];

  // Title: up to three lines, centred in the paper strip.
  const { title } = spec;
  let t = fitBlock([shortTitle(sale.title)], title.size, title.min, 3, measure, title.width);
  while (blockHeight(t.lines.length, t.size) > title.bottom - title.top && t.size > title.min) t = fitBlock([shortTitle(sale.title)], t.size - 2, title.min, 3, measure, title.width);
  let y = title.top + (title.bottom - title.top - blockHeight(t.lines.length, t.size)) / 2;
  t.lines.forEach((text, i) => lines.push({ text, size: t.size, x: title.left + title.width / 2, y: y + t.size * CAP + i * t.size * LEADING, colour: "ink", align: "center" }));

  // Days: a column each (up to three), one size for every column, centred on the orange band.
  const { band } = spec, days = sale.days.slice(0, 3).map(socialDay);
  if (days.length) {
    const colWidth = band.width / days.length - 24, boost = DAY_BOOST[days.length] ?? 1;
    const fit = (size: number, pick: (d: ReturnType<typeof socialDay>) => string) => Math.min(size, ...days.map(d => size * colWidth / Math.max(measure(pick(d), size), colWidth)));
    let name = fit(band.name * boost, d => d.name), date = Math.min(fit(band.date * boost, d => d.date), fit(band.date * boost, d => d.time));
    const total = () => name * CAP + 2 * date * DAY_LEADING;
    const room = band.bottom - band.top - 24;
    if (total() > room) { const k = room / total(); name *= k; date *= k; }
    const top = band.top + (band.bottom - band.top - total()) / 2;
    days.forEach((d, i) => {
      const x = band.left + (band.width / days.length) * (i + 0.5);
      lines.push({ text: d.name, size: name, x, y: top + name * CAP, colour: "paper", align: "center" });
      lines.push({ text: d.date, size: date, x, y: top + name * CAP + date * DAY_LEADING, colour: "paper", align: "center" });
      lines.push({ text: d.time, size: date, x, y: top + name * CAP + 2 * date * DAY_LEADING, colour: "paper", align: "center" });
    });
  }

  // Address (as buyers see it) then the category tags, left-aligned beside the logo.
  const { info } = spec, address = signText(sale.addressLabel).toUpperCase().split(" · ").filter(Boolean);
  const tagSize = info.tags; let tags = socialTags(sale);
  const tagGap = () => tagSize * 0.9;
  const tagsWidth = () => tags.reduce((w, tag) => w + measure(tag, tagSize), 0) + tagGap() * Math.max(tags.length - 1, 0);
  while (tags.length && tagsWidth() > info.width) tags = tags.slice(0, -1);
  for (let size = info.address; ; size -= 2) {
    const a = fitBlock(address, size, Math.min(size, info.min), address.length > 1 ? 3 : 2, measure, info.width);
    const gap = tags.length ? size * 0.6 : 0, total = blockHeight(a.lines.length, a.size) + (tags.length ? gap + tagSize * CAP : 0);
    if (total > info.bottom - info.top && size > info.min) continue;
    y = info.top + a.size * CAP;
    a.lines.forEach((text, i) => lines.push({ text, size: a.size, x: info.left, y: y + i * a.size * LEADING, colour: "ink", align: "left" }));
    y += (a.lines.length - 1) * a.size * LEADING + gap + tagSize * CAP;
    let x = info.left;
    for (const tag of tags) { lines.push({ text: tag, size: tagSize, x, y, colour: "ink", align: "left" }); x += measure(tag, tagSize) + tagGap(); }
    return lines;
  }
}

let fontReady: Promise<void> | undefined;
function loadFont(): Promise<void> {
  fontReady ??= new FontFace(SIGN_FONT, "url(/sign/BowlbyOneSC-Regular.ttf)").load().then(face => { document.fonts.add(face); });
  return fontReady;
}

async function bitmap(source: Blob | string): Promise<ImageBitmap> {
  if (typeof source !== "string") return createImageBitmap(source);
  const res = await fetch(source); if (!res.ok) throw new Error("Couldn’t load an image for your post.");
  return createImageBitmap(await res.blob());
}

// Draws the image in the browser. photo is the seller's first photo (a Blob or a signed URL); Josh's sample photo stands in without one.
export async function createSocialImage(sale: BuyerSale, kind: SocialKind, photo?: Blob | string): Promise<Blob> {
  const spec = SOCIAL[kind];
  await loadFont();
  const [base, mask] = await Promise.all([bitmap(`/social/${kind}-base.png`), bitmap(`/social/${kind}-mask.png`)]);
  const picture = await (photo ? bitmap(photo) : Promise.reject()).catch(() => bitmap(`/social/${kind}-photo.jpg`));
  const canvas = document.createElement("canvas"); canvas.width = spec.width; canvas.height = spec.height;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("This browser can’t make images.");
  ctx.drawImage(base, 0, 0);

  // Photo: cover the slot, centred, then cut to the template's torn edge.
  const slot = document.createElement("canvas"); slot.width = spec.width; slot.height = spec.photoHeight;
  const sctx = slot.getContext("2d")!;
  const scale = Math.max(spec.width / picture.width, spec.photoHeight / picture.height);
  sctx.drawImage(picture, (spec.width - picture.width * scale) / 2, (spec.photoHeight - picture.height * scale) / 2, picture.width * scale, picture.height * scale);
  sctx.globalCompositeOperation = "destination-in"; sctx.drawImage(mask, 0, 0);
  ctx.drawImage(slot, 0, 0);

  const measure: Measure = (text, size) => { ctx.font = `${size}px ${SIGN_FONT}`; return ctx.measureText(text).width; };
  for (const line of layoutSocial(sale, kind, measure)) {
    ctx.font = `${line.size}px ${SIGN_FONT}`; ctx.fillStyle = COLOURS[line.colour]; ctx.textAlign = line.align; ctx.textBaseline = "alphabetic";
    ctx.fillText(line.text, line.x, line.y);
  }
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Couldn’t save the image.")), "image/jpeg", 0.9));
}
