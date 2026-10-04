"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const tabs = [{ href: "/map", label: "Map", icon: "map" }, { href: "/hunt", label: "Hunt", icon: "search" }, { href: "/sell", label: "Sell", icon: "plus" }, { href: "/saved", label: "Saved", icon: "heart" }, { href: "/me", label: "Me", icon: "user" }];
function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    user: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  };
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="workspace"><header className="workspace-header"><Link href="/" aria-label="SNAB home"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={110} height={54} priority /></Link><span className="build-label">UX demo</span><Link href="/me" className="workspace-drafts-link">My space</Link></header><main className="workspace-main">{children}</main><nav className="bottom-nav" aria-label="App navigation">{tabs.map(tab => { const active = pathname === tab.href || (tab.href === "/sell" && pathname.startsWith("/sell/")) || (tab.href === "/map" && ["/sale/", "/item/", "/directions/"].some(prefix => pathname.startsWith(prefix))) || (tab.href === "/me" && ["/manage/", "/account"].some(prefix => pathname.startsWith(prefix))); return <Link href={tab.href} key={tab.href} aria-label={tab.icon === "plus" ? "Start a sale" : undefined} aria-current={active ? "page" : undefined} className={`${active ? "active " : ""}${tab.icon === "plus" ? "sell-tab" : ""}`}><span className="nav-icon"><NavIcon name={tab.icon} /></span>{tab.icon !== "plus" && <span>{tab.label}</span>}</Link>; })}</nav></div>;
}
