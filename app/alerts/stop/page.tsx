import { Suspense } from "react";
import StopAlerts from "../../../components/stop-alerts";
export const metadata = { title: "Stop treasure alerts · SNAB" };
export default function Page() { return <Suspense fallback={<p>Opening SNAB…</p>}><StopAlerts /></Suspense>; }
