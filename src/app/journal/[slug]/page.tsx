import { notFound } from "next/navigation";
import { JOURNAL_ARTICLES } from "@/experience/content/journal";
import { JournalArticlePage } from "@/experience/pages/Journal";

export const dynamicParams = false;

export function generateStaticParams() {
  return JOURNAL_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = JOURNAL_ARTICLES.find((x) => x.slug === slug);
  return { title: a ? `${a.title} · The Journal` : "The Journal" };
}

export default async function JournalArticleRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!JOURNAL_ARTICLES.some((a) => a.slug === slug)) notFound();
  return <JournalArticlePage slug={slug} />;
}
