import { Suspense } from "react";
import AccountDemo from "../../../components/account-demo";
export default function Page() { return <Suspense fallback={<p>Opening SNAB…</p>}><AccountDemo /></Suspense>; }
