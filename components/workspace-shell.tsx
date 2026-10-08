"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { appHome } from "../lib/launch";
import { supabaseConfigured } from "../lib/supabase/client";
import { TreasureSync } from "../lib/treasure-sync";

const tabs = [{ href: "/map", label: "Find", icon: "search" }, { href: "/sell", label: "Sell", icon: "plus" }, { href: "/saved", label: "Saved", icon: "heart" }, { href: "/me", label: "Me", icon: "user" }];
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
  return <div className="workspace">
    <TreasureSync />
    <header className="workspace-header">
      <Link href={appHome} aria-label="SNAB home" className="workspace-logo"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={100} height={49} priority /></Link>
      <div className="workspace-header-actions">{!supabaseConfigured() && <span className="build-label">Demo</span>}</div>
    </header>
    <main className="workspace-main" id="main-content">{children}</main>
    <nav className="bottom-nav" aria-label="App navigation">{tabs.map(tab => {
      const active = pathname === tab.href || (tab.href === "/sell" && pathname.startsWith("/sell/")) || (tab.href === "/map" && (["/hunt", "/event"].includes(pathname) || ["/sale/", "/item/", "/directions/"].some(prefix => pathname.startsWith(prefix)))) || (tab.href === "/me" && ["/manage/", "/account"].some(prefix => pathname.startsWith(prefix)));
      return <Link href={tab.href} key={tab.href} aria-current={active ? "page" : undefined} className={active ? "active" : undefined}><span className="nav-icon"><NavIcon name={tab.icon} /></span><span>{tab.label}</span></Link>;
    })}</nav>
  </div>;
}
