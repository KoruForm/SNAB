"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPartner, rememberPartner, type Partner } from "../lib/partners";
import { SnapPhoto } from "./snap-photo";

// A partner's link (/p/<code>): who sent you, and a free sale. The code rides along to the sale the seller starts.
export function PartnerLanding({ code }: { code: string }) {
  const [partner, setPartner] = useState<Partner | null>(); 
  useEffect(() => { let active = true; fetchPartner(code).then(p => { if (!active) return; setPartner(p); if (p) rememberPartner(p.code); }); return () => { active = false; }; }, [code]);
  if (partner === undefined) return <p role="status">Opening SNAB…</p>;
  const lead = partner?.kind === "agent" || partner?.kind === "mover" ? "Moving? Clear the house in one morning." : "Clear out the clutter in one morning.";
  return <section className="partner-landing">
    <p className="eyebrow">{partner ? `With ${partner.name}` : "SNAB"}</p>
    <h1>{lead.split(". ")[0]}.<br /><span className="highlight">{lead.split(". ")[1]}</span></h1>
    <SnapPhoto name="startSale" className="start-photo" />
    {partner?.blurb && <p className="workspace-lede">{partner.blurb}</p>}
    <ol className="start-steps"><li><span>1</span>List your garage sale free</li><li><span>2</span>Print your sign and share it everywhere</li><li><span>3</span>Buyers hunting for your stuff get told</li></ol>
    <Link className="button button-primary full-width" href="/sell">Start my free sale</Link>
    {partner && <p className="field-help">{partner.name} supports SNAB. Your sale shows “Listed free with support from {partner.name}”.</p>}
  </section>;
}
