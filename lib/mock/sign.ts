import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { formatDay } from "../drafts/types";
import type { BuyerSale } from "./catalogue";
export async function createSaleSign(sale: BuyerSale, url: string): Promise<ArrayBuffer> {
  const pdf = new jsPDF();
  const code = await QRCode.toDataURL(url, { width: 480, margin: 1 });
  pdf.setFillColor(247, 243, 232); pdf.rect(0, 0, 210, 297, "F");
  pdf.setFillColor(242, 201, 76); pdf.rect(17, 18, 176, 46, "F");
  pdf.setTextColor(34, 35, 33); pdf.setFont("helvetica", "bold");
  pdf.setFontSize(58); pdf.text("SNAB", 105, 52, { align: "center" });
  pdf.setFontSize(23); pdf.text("GARAGE SALE", 105, 85, { align: "center" });
  pdf.setFontSize(17); pdf.text(pdf.splitTextToSize(sale.title, 170).slice(0, 2), 105, 101, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(12);
  const days = sale.days.slice(0, 3).map(d => `${formatDay(d)}  ${d.starts} - ${d.finishes}`);
  if (sale.days.length > 3) days.push("More dates on the listing");
  pdf.text(days, 105, 123, { align: "center" });
  pdf.setFontSize(11); pdf.text(pdf.splitTextToSize(sale.addressLabel, 165).slice(0, 3), 105, 154, { align: "center" });
  pdf.addImage(code, "PNG", 70, 180, 70, 70);
  pdf.setFontSize(10); pdf.text("Scan to have a look", 105, 260, { align: "center" });
  pdf.setFontSize(8); pdf.text(sale.sample ? "UX DEMO - fictional sample sale" : "UX DEMO - listing is saved on the seller's device only", 105, 277, { align: "center" });
  pdf.text("Garage Sales Made Easy", 105, 286, { align: "center" });
  return pdf.output("arraybuffer");
}
