import { Suspense } from "react";
import { notFound } from "next/navigation";
import SellerWizard, { type WizardStep } from "../../../../components/seller-wizard";
export default async function SellerStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!["when", "where", "photos", "review", "preview"].includes(step)) notFound();
  return <Suspense fallback={<p>Opening your draft…</p>}><SellerWizard key={step} step={step as WizardStep} /></Suspense>;
}
