import { Suspense } from "react";
import { SaleSearch } from "../../../../../components/buyer-ui";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const p = await params; return <Suspense fallback={<p>Opening SNAB…</p>}><SaleSearch id={p.id} /></Suspense>; }
