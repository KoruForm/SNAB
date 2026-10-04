import { Suspense } from "react";
import { HuntPage } from "../../../components/buyer-ui";
export default function Page() { return <Suspense fallback={<p>Opening SNAB…</p>}><HuntPage /></Suspense>; }
