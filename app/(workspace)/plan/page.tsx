import { Suspense } from "react";
import { PlanMorning } from "../../../components/plan-morning";
export default function Page() { return <Suspense fallback={<p>Opening SNAB…</p>}><PlanMorning /></Suspense>; }
