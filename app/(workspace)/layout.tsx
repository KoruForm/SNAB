import type { ReactNode } from "react";
import WorkspaceShell from "../../components/workspace-shell";
import "./workspace.css";
import "./discovery.css";
export default function WorkspaceLayout({ children }: { children: ReactNode }) { return <WorkspaceShell>{children}</WorkspaceShell>; }
