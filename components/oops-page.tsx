import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

// The page people see when something goes wrong or a link is out of date, so they're never left on a blank screen.
export default function OopsPage({ title, children, action }: { title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <main className="oops-page">
      <Link href="/" aria-label="SNAB home"><Image src="/brand/snab-yellow-badge.svg" alt="SNAB" width={120} height={60} unoptimized priority /></Link>
      <h1>{title}</h1>
      <p>{children}</p>
      <div className="oops-actions">{action}<Link className="button button-quiet" href="/map">Find sales</Link></div>
    </main>
  );
}
