import { Suspense } from "react";
import { DirectionsPage } from "../../../../components/buyer-ui";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const p = await params; return <Suspense fallback={<p>Opening SNAB…</p>}><DirectionsPage id={p.id} /></Suspense>; }
