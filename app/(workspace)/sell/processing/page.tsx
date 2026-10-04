import { Suspense } from "react";
import ScanDemo from "../../../../components/scan-demo";
export default function Page() { return <Suspense fallback={<p>Opening SNAB…</p>}><ScanDemo /></Suspense>; }
