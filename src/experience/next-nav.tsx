"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { NavProvider } from "./nav";

export function NextNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  return <NavProvider navigate={(href) => router.push(href)}>{children}</NavProvider>;
}
