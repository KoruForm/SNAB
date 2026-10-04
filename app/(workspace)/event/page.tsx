import { Suspense } from "react";
import { MapPage } from "../../../components/buyer-ui";
export default function Page() { return <Suspense fallback={<p>Opening SNAB…</p>}><MapPage event /></Suspense>; }
