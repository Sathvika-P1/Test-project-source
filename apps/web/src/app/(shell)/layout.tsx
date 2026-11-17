import type { ReactNode } from "react";
import { SiteShell } from "@/components/SiteShell";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <SiteShell active="account">{children}</SiteShell>;
}
