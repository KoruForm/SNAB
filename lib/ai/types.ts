/**
 * Stable app-facing contract for sale-photo analysis.
 * Provider-specific request/response formats should be translated into these types.
 */

export type Confidence = "low" | "medium" | "high";

export type DetectedItem = {
  label: string;
  description: string;
  confidence: Confidence;
  notable: boolean;
  sourcePhotoId: string;
};

export type PhotoAnalysis = {
  photoId: string;
  category: string;
  summary: string;
  detections: DetectedItem[];
  privacyFlags: Array<"face" | "number_plate" | "document" | "screen" | "medication">;
  warnings: string[];
};

export type SaleInventory = {
  saleId: string;
  summary: string;
  categories: Array<{ name: string; approximateCount?: number }>;
  highlights: DetectedItem[];
  analyses: PhotoAnalysis[];
  status: "draft" | "needs-review" | "ready";
};

export type HuntQuery = {
  query: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  dateFrom?: string;
  dateTo?: string;
};
