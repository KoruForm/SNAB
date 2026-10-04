import { Suspense } from "react";
import ManageSale from "../../../../components/manage-sale";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const {id}=await params; return <Suspense fallback={<p>Opening your sale…</p>}><ManageSale id={id} /></Suspense>; }
