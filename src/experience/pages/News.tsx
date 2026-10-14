"use client";

import { PUBLICATIONS } from "../content/news";
import { SiteShell } from "../SiteShell";

export function NewsDirectory() {
  return (
    <SiteShell current="news" hero={
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80">Industry News</p>
        <h1 className="display mt-2 text-3xl sm:text-5xl">The morning papers</h1>
        <p className="mt-3 max-w-2xl text-white/85">A short list of hospitality and foodservice publications worth reading. Each link opens the publisher&apos;s own site.</p>
      </>
    }>
      <ul className="grid gap-4 md:grid-cols-2">
        {PUBLICATIONS.map((p) => (
          <li key={p.name} className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-6 shadow-card">
            <p className="eyebrow">{p.region}</p>
            <h2 className="display mt-1 text-2xl">{p.name}</h2>
            <p className="mt-1 text-sm font-medium">{p.focus}</p>
            <p className="mt-3 flex-1 text-sm text-muted">{p.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.topics.map((t) => <span key={t} className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-muted">{t}</span>)}
            </div>
            <div className="mt-5">
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                  Visit {p.url.replace(/^https?:\/\/(www\.)?/, "")} <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span className="text-sm text-warn">Web address to be confirmed before linking</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-muted">ChefOS links to publishers and does not copy or republish their articles. Publication names belong to their owners.</p>
    </SiteShell>
  );
}
