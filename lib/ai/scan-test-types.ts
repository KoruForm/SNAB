// Shared by the scan field test page and its server route (see lib/ai/scan-test.ts).
export const SCAN_SUPPLIERS = ["claude", "gemini", "openai"] as const;
export type ScanSupplier = (typeof SCAN_SUPPLIERS)[number];

export const SCAN_CATEGORIES = ["Furniture", "Tools", "Books", "Electronics", "Clothing", "Kitchen", "Garden", "Toys", "Free", "Other"];

export type ScanItem = {
  label: string;
  category: string;
  description: string;
  search_terms: string[];
  highlight: boolean;
  confidence: "low" | "medium" | "high";
  box: { x_min: number; y_min: number; x_max: number; y_max: number };
};
export type ScanAnswer = { summary: string; items: ScanItem[]; privacy_flags: string[] };
export type ScanResult = { supplier: ScanSupplier; model: string; ms: number; costUsd: number; answer: ScanAnswer };
