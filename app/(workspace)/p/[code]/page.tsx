import { PartnerLanding } from "../../../../components/partner-landing";
export default async function Page({ params }: { params: Promise<{ code: string }> }) { const p = await params; return <PartnerLanding code={p.code} />; }
