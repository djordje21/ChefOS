"use client";

import { useState } from "react";
import { JOURNAL_ARTICLES, JOURNAL_CATEGORIES, type JournalArticle } from "../content/journal";
import { SiteLink } from "../nav";
import { PlaceholderTag, SiteShell } from "../SiteShell";

const categoryName = (id: string) => JOURNAL_CATEGORIES.find((c) => c.id === id)?.name ?? id;

export function JournalIndex() {
  const [category, setCategory] = useState<string>("all");
  const articles = JOURNAL_ARTICLES.filter((a) => category === "all" || a.category === category);
  const published = JOURNAL_ARTICLES.filter((a) => a.status === "published").length;

  return (
    <SiteShell current="journal" hero={
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80">The Journal</p>
        <h1 className="display mt-2 text-3xl sm:text-5xl">Notes from the pass</h1>
        <p className="mt-3 max-w-2xl text-white/85">Technique, kitchen management, food cost, leadership, pre-opening and the chef&apos;s career.</p>
      </>
    }>
      {published === 0 && (
        <p className="mb-6 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          No articles are published yet. The entries below are placeholders: planned topics with an outline, not finished writing.
        </p>
      )}
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Categories">
        {[{ id: "all", name: "All" }, ...JOURNAL_CATEGORIES].map((c) => (
          <button key={c.id} role="tab" aria-selected={category === c.id} onClick={() => setCategory(c.id)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${category === c.id ? "border-ink bg-ink text-canvas" : "border-line-strong text-muted hover:text-ink"}`}>
            {c.name}
          </button>
        ))}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => <ArticleCard key={a.slug} article={a} />)}
      </ul>
    </SiteShell>
  );
}

function ArticleCard({ article: a }: { article: JournalArticle }) {
  return (
    <li className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{categoryName(a.category)}</p>
        {a.status === "placeholder" && <PlaceholderTag />}
      </div>
      <h2 className="display mt-2 text-xl leading-snug">
        <SiteLink href={`/journal/${a.slug}`} className="hover:text-accent">{a.title}</SiteLink>
      </h2>
      <p className="mt-2 flex-1 text-sm text-muted">{a.dek}</p>
      <p className="mt-4 text-xs text-muted">{a.status === "published" ? `${a.publishedOn} · ${a.readingMinutes} min read` : "Planned article"}</p>
    </li>
  );
}

export function JournalArticlePage({ slug }: { slug: string }) {
  const a = JOURNAL_ARTICLES.find((x) => x.slug === slug);
  if (!a) {
    return (
      <SiteShell current="journal" hero={<h1 className="display text-3xl">Article not found</h1>}>
        <SiteLink href="/journal" className="font-semibold text-accent hover:underline">All articles</SiteLink>
      </SiteShell>
    );
  }
  return (
    <SiteShell current="journal" hero={
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80">{categoryName(a.category)}</p>
        <h1 className="display mt-2 max-w-3xl text-3xl sm:text-5xl">{a.title}</h1>
        <p className="mt-3 max-w-2xl text-white/85">{a.dek}</p>
      </>
    }>
      <article className="mx-auto max-w-2xl">
        {a.status === "placeholder" ? (
          <>
            <p className="rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
              Placeholder. This article has not been written yet. Below is the planned outline.
            </p>
            <h2 className="mt-6 font-semibold">What it will cover</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[1.02rem] leading-relaxed">
              {a.outline?.map((o) => <li key={o}>{o}</li>)}
            </ol>
          </>
        ) : (
          <div className="space-y-4 text-[1.05rem] leading-relaxed">{a.body?.map((p, i) => <p key={i}>{p}</p>)}</div>
        )}
        <p className="mt-10"><SiteLink href="/journal" className="font-semibold text-accent hover:underline">← All articles</SiteLink></p>
      </article>
    </SiteShell>
  );
}
