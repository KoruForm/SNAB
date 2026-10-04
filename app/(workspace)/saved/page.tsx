import { Suspense } from "react";
import { SavedPage } from "../../../components/buyer-ui";
export default function Page() { return <Suspense fallback={<p>Opening SNAB…</p>}><SavedPage /></Suspense>; }
