"use client";

import { createContext, useContext, type ComponentProps, type ReactNode } from "react";

/**
 * Router-agnostic navigation, so the same experience components run inside the
 * Next.js app (router.push) and in the single-file hosted preview (in-page state).
 */
type Navigate = (href: string) => void;
const NavContext = createContext<Navigate>((href) => {
  window.location.assign(href);
});

export function NavProvider({ navigate, children }: { navigate: Navigate; children: ReactNode }) {
  return <NavContext.Provider value={navigate}>{children}</NavContext.Provider>;
}

export const useNavigate = () => useContext(NavContext);

/** An ordinary <a href> (works without JS, opens in new tab with modifiers) that navigates in-app when clicked. */
export function SiteLink({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  const navigate = useNavigate();
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={(e) => {
        onClick?.(e);
        if (external || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      {...props}
    />
  );
}
