import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { TITLE_MAX, type SaleDay } from "../drafts/types";
import type { BuyerSale } from "./catalogue";

// Josh's A4 template (design/sign/a4-template.svg) is pre-rendered to public/sign/a4-template.png.
// Everything that changes per sale is drawn on top in Bowlby One SC. All measurements are in mm.
export const SIGN_FONT = "BowlbyOneSC";
const CAP = 1520 / 2048; // cap height of Bowlby One SC, as a share of the font size
const PT = 25.4 / 72;
const LEFT = 15, WIDTH = 180, CENTRE = 105;
const ZONE_TOP = 64, ZONE_BOTTOM = 168; // between "GARAGE SALE" and the yellow QR panel
const QR = { x: 80.85, y: 183.3, size: 50 }; // centred in the template's white square
const BASE = { title: 30, dayTitle: 24, date: 20, address: 36, more: 14 }; // pt, from the design
const DAY_BOOST: Record<number, number> = { 1: 1.6, 2: 1.3 };
const LEADING = 1.1, DAY_LEADING = 1.25; // baseline-to-baseline, as a multiple of the font size
const MIN = { title: 26, address: 20 }; // titles are capped at TITLE_MAX, so they barely need to shrink

export type SignAssets = { background: string; font: string }; // PNG data URL, base64 TTF
export type SignLine = { text: string; size: number; x: number; y: number }; // y = baseline
export type SignLayout = { lines: SignLine[]; scale: number };
type Measure = (text: string, size: number) => number; // width in mm of text at size pt

export function signDay(day: SaleDay): { name: string; date: string; time: string } {
  const time = `${day.starts} - ${day.finishes}`;
  if (!day.date) return { name: "Date", date: "to be confirmed", time };
  const d = new Date(`${day.date}T12:00:00Z`);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NZ", { ...o, timeZone: "UTC" }).format(d);
  return { name: part({ weekday: "long" }), date: `${part({ day: "numeric" })} ${part({ month: "long" })}`, time };
}

// Bowlby One SC only covers Latin-1 plus curly quotes and dashes: macrons are dropped (ā → a), emoji removed.
export function signText(text: string): string {
  return text.normalize("NFD").replace(/\u0304/g, "").normalize("NFC").replace(/[^\x20-\x7E\u00A0-\u00FF‘’“”–—…·]/gu, "").replace(/\s+/g, " ").trim();
}

// Titles saved before the TITLE_MAX limit are cut at a word boundary.
function shortTitle(text: string): string {
  const clean = signText(text) || "Garage sale";
  if (clean.length <= TITLE_MAX) return clean;
  const cut = clean.slice(0, TITLE_MAX - 1), space = cut.lastIndexOf(" ");
  return `${(space > TITLE_MAX / 2 ? cut.slice(0, space) : cut).replace(/[\s,:;–—-]+$/, "")}…`;
}

function wrap(text: string, size: number, width: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && measure(`${last} ${word}`, size) <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function clip(text: string, size: number, width: number, measure: Measure): string {
  if (measure(text, size) <= width) return text;
  let cut = text;
  while (cut.length > 1 && measure(`${cut}…`, size) > width) cut = cut.slice(0, -1).trimEnd();
  return `${cut}…`;
}

// Wraps text into at most maxLines, shrinking from size towards min first, then clipping the last line.
function fitBlock(paragraphs: string[], size: number, min: number, maxLines: number, measure: Measure) {
  for (let s = size; ; s -= 1) {
    const lines = paragraphs.flatMap(p => wrap(p, s, WIDTH, measure)).map(l => clip(l, s, WIDTH, measure));
    if (lines.length <= maxLines) return { lines, size: s };
    if (s <= min) { lines.length = maxLines; lines[maxLines - 1] = clip(`${lines[maxLines - 1].replace(/…$/, "")}…`, s, WIDTH, measure); return { lines, size: s }; }
  }
}

const height = (count: number, size: number) => (count - 1) * size * PT * LEADING + size * PT * CAP;

export function layoutSaleSign(sale: BuyerSale, measure: Measure): SignLayout {
  const days = sale.days.slice(0, 3).map(signDay), more = sale.days.length > 3;
  const address = signText(sale.addressLabel).toUpperCase().split(" · ").filter(Boolean);
  const cols = Math.max(days.length, 1), colWidth = WIDTH / cols - 4, maxBoost = DAY_BOOST[days.length] ?? 1;
  // Try the design sizes first: give up the 1–2 day enlargement before shrinking everything else.
  const attempts: [number, number][] = [];
  for (let b = maxBoost; b > 1.001; b -= 0.1) attempts.push([1, b]);
  for (let scale = 1; scale > 0.5; scale -= 0.05) attempts.push([scale, 1]);
  for (const [i, [scale, boost]] of attempts.entries()) {
    const title = fitBlock([shortTitle(sale.title)], BASE.title * scale, MIN.title * scale, 3, measure);
    const addr = fitBlock(address, BASE.address * scale, MIN.address * scale, address.length > 1 ? 3 : 2, measure);
    // One size for every day column, shrunk until the widest day fits its column.
    const fit = (size: number, pick: (d: ReturnType<typeof signDay>) => string) =>
      Math.min(size, ...days.map(d => size * colWidth / Math.max(measure(pick(d).toUpperCase(), size), colWidth)));
    const dayTitle = fit(BASE.dayTitle * scale * boost, d => d.name), date = fit(BASE.date * scale * boost, d => d.date), time = fit(BASE.date * scale * boost, d => d.time);
    const daysHeight = days.length ? height(1, dayTitle) + (date + time) * PT * DAY_LEADING : 0;
    const blocks = [height(title.lines.length, title.size), daysHeight + (more ? BASE.more * PT * 1.3 : 0), height(addr.lines.length, addr.size)].filter(h => h > 0);
    const free = ZONE_BOTTOM - ZONE_TOP - blocks.reduce((a, b) => a + b, 0);
    if (free < blocks.length * 6 && i < attempts.length - 1) continue;
    const gap = Math.min(free / blocks.length, 14), lines: SignLine[] = [];
    let y = ZONE_TOP + (free - gap * (blocks.length - 1)) / 2;
    const stack = (texts: string[], size: number) => { texts.forEach((text, i) => lines.push({ text, size, x: CENTRE, y: y + size * PT * CAP + i * size * PT * LEADING })); y += height(texts.length, size) + gap; };
    stack(title.lines, title.size);
    if (days.length) {
      const top = y;
      days.forEach((d, i) => {
        const x = LEFT + (WIDTH / cols) * (i + 0.5); let row = top + dayTitle * PT * CAP;
        lines.push({ text: d.name.toUpperCase(), size: dayTitle, x, y: row });
        row += date * PT * DAY_LEADING; lines.push({ text: d.date.toUpperCase(), size: date, x, y: row });
        row += time * PT * DAY_LEADING; lines.push({ text: d.time.toUpperCase(), size: time, x, y: row });
      });
      y = top + daysHeight;
      if (more) { y += BASE.more * PT * 1.3; lines.push({ text: "More dates on the listing", size: BASE.more, x: CENTRE, y }); }
      y += gap;
    }
    stack(addr.lines, addr.size);
    return { lines, scale };
  }
  throw new Error("Couldn’t lay out the sign.");
}

async function loadAssets(): Promise<SignAssets> {
  const [bg, font] = await Promise.all(["/sign/a4-template.png", "/sign/BowlbyOneSC-Regular.ttf"].map(async path => {
    const res = await fetch(path); if (!res.ok) throw new Error("Couldn’t load the sign design. Try again."); return res.arrayBuffer();
  }));
  const base64 = (b: ArrayBuffer) => { let s = ""; const bytes = new Uint8Array(b); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
  return { background: `data:image/png;base64,${base64(bg)}`, font: base64(font) };
}

export async function createSaleSign(sale: BuyerSale, url: string, assets?: SignAssets): Promise<ArrayBuffer> {
  const { background, font } = assets ?? await loadAssets();
  const pdf = new jsPDF({ compress: true });
  pdf.addFileToVFS("BowlbyOneSC-Regular.ttf", font); pdf.addFont("BowlbyOneSC-Regular.ttf", SIGN_FONT, "normal");
  pdf.addImage(background, "PNG", 0, 0, 210, 297, undefined, "FAST");
  pdf.setFont(SIGN_FONT, "normal"); pdf.setTextColor(0, 0, 0);
  const measure: Measure = (text, size) => pdf.getStringUnitWidth(text) * size * PT;
  for (const line of layoutSaleSign(sale, measure).lines) { pdf.setFontSize(line.size); pdf.text(line.text, line.x, line.y, { align: "center" }); }
  pdf.addImage(await QRCode.toDataURL(url, { width: 600, margin: 0 }), "PNG", QR.x, QR.y, QR.size, QR.size);
  if (sale.sample) { pdf.setFontSize(8); pdf.setTextColor(120, 120, 120); pdf.text("Fictional sample sale", CENTRE, 6, { align: "center" }); }
  return pdf.output("arraybuffer");
}
