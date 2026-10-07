import { jsPDF } from "jspdf";
import { STICKER_PRICES } from "./sale-details";

// An A4 sheet of coloured price dots to cut out, with the colour key at the top to stick on the table.
// Each row is one price, so a seller can print a page and colour-code the whole sale. Sizes in mm.
export function createStickerSheet(): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("SNAB price key", 105, 18, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text("Stick this on your table, then put a dot on each thing. Cut along the dashed lines.", 105, 25, { align: "center" });
  STICKER_PRICES.forEach((s, n) => {
    const x = 20 + n * 30;
    doc.setFillColor(s.colour); doc.setDrawColor("#222321"); doc.setLineWidth(0.6); doc.circle(x + 5, 37, 6, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor("#222321"); doc.text(s.price, x + 13, 38.5);
  });
  doc.setLineDashPattern([2, 2], 0); doc.setLineWidth(0.3); doc.line(10, 48, 200, 48); doc.setLineDashPattern([], 0);
  const size = 24, gap = 6, perRow = 6, top = 56;
  STICKER_PRICES.forEach((s, row) => {
    for (let col = 0; col < perRow; col++) {
      const cx = 20 + size / 2 + col * (size + gap), cy = top + size / 2 + row * (size + gap - 2);
      doc.setFillColor(s.colour); doc.setDrawColor("#222321"); doc.setLineWidth(0.6); doc.circle(cx, cy, size / 2, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(s.price.length > 3 ? 15 : 19); doc.setTextColor("#222321");
      doc.text(s.price, cx, cy + 2.5, { align: "center" });
    }
  });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor("#555555");
  doc.text("Tip: round label stickers from the stationery shop work too. Write the price on, or use one colour per price.", 105, 287, { align: "center" });
  return doc.output("arraybuffer");
}
