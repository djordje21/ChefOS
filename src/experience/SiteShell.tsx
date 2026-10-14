"use client";

import type { ReactNode } from "react";
import { DESTINATIONS, type DestinationId } from "./destinations";
import { SiteLink } from "./nav";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Frame for the public destinations: way back to the kitchen, the five destinations, sign-in. */
export function SiteShell({ current, children, hero }: { current: DestinationId; children: ReactNode; hero: ReactNode }) {
  const d = DESTINATIONS.find((x) => x.id === current)!;
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <SiteLink href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
            <span aria-hidden="true">←</span> Back to the kitchen
          </SiteLink>
          <nav aria-label="Destinations" className="flex min-w-0 flex-1 gap-1 overflow-x-auto text-sm">
            {DESTINATIONS.map((x) => (
              <SiteLink key={x.id} href={x.href} aria-current={x.id === current ? "page" : undefined}
                className={cx("shrink-0 rounded-md px-2.5 py-1 font-medium", x.id === current ? "bg-surface-2 text-ink" : "text-muted hover:text-ink")}>
                {x.title.replace(/^The /, "")}
              </SiteLink>
            ))}
          </nav>
          <SiteLink href="/login" className="text-sm font-semibold text-accent hover:underline">Sign in</SiteLink>
        </div>
      </header>
      <div className="border-b border-line" style={{ background: `linear-gradient(120deg, ${d.ink}, color-mix(in srgb, ${d.ink} 55%, #000))` }}>
        <div className="mx-auto max-w-6xl px-4 py-10 text-white sm:py-14">{hero}</div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

export function PlaceholderTag({ children = "Placeholder" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-warn/30 bg-warn-soft px-2 py-0.5 text-[0.7rem] font-semibold text-warn">{children}</span>;
}
