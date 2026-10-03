import { Suspense } from "react";
import SellerWizard from "../../../components/seller-wizard";
export default function SellPage() { return <Suspense fallback={<p>Opening your sale…</p>}><SellerWizard step="start" /></Suspense>; }
