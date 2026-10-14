/**
 * Standalone entry for the hosted preview (claude.ai artifact): the cinematic
 * kitchen landing and the five destinations, with a tiny hash router instead of
 * Next.js. Same components as the app; fictional data; no network calls.
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DemoApp } from "@/demo/DemoApp";
import { NavProvider, SiteLink } from "@/experience/nav";
import { Landing } from "@/experience/Landing";
import { JOURNAL_ARTICLES } from "@/experience/content/journal";
import { JournalArticlePage, JournalIndex } from "@/experience/pages/Journal";
import { NewsDirectory } from "@/experience/pages/News";
import { PreOpening } from "@/experience/pages/PreOpening";

const current = () => decodeURIComponent(location.hash.slice(1)) || "/";

function SignInNotice() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="display text-2xl">Sign-in lives in the full app</h1>
      <p className="mt-2 text-sm text-muted">This hosted preview has no accounts. Real workspaces, private recipes and supplier prices stay behind sign-in in ChefOS itself.</p>
      <SiteLink href="/" className="mt-6 inline-block text-sm font-semibold text-accent hover:underline">← Back to the kitchen</SiteLink>
    </main>
  );
}

function Page({ path }: { path: string }) {
  if (path === "/") return <Landing />;
  if (path === "/recipes") return <DemoApp initialScreen="book" />;
  if (path === "/food-cost" || path === "/demo") return <DemoApp initialScreen="recipes" />;
  if (path === "/journal") return <JournalIndex />;
  const slug = path.match(/^\/journal\/([a-z0-9-]+)$/)?.[1];
  if (slug && JOURNAL_ARTICLES.some((a) => a.slug === slug)) return <JournalArticlePage slug={slug} />;
  if (path === "/news") return <NewsDirectory />;
  if (path === "/pre-opening") return <PreOpening />;
  return <SignInNotice />;
}

function PreviewSite() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const onHash = () => {
      setPath(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [path]);
  return (
    <NavProvider navigate={(href) => { location.hash = href; }}>
      <Page key={path} path={path} />
    </NavProvider>
  );
}

createRoot(document.getElementById("root")!).render(<PreviewSite />);
