import { Suspense } from "react";
import { SaleDetail } from "../../../../components/buyer-ui";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const p = await params; return <Suspense fallback={<p>Opening SNAB…</p>}><SaleDetail id={p.id} /></Suspense>; }
