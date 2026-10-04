import { Suspense } from "react";
import { ItemDetail } from "../../../../../components/buyer-ui";
export default async function Page({ params }: { params: Promise<{ saleId: string; itemId: string }> }) { const p = await params; return <Suspense fallback={<p>Opening SNAB…</p>}><ItemDetail saleId={p.saleId} itemId={p.itemId} /></Suspense>; }
