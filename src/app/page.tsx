import type { Metadata } from "next";
import { cookies } from "next/headers";
import { INTRO_COOKIE } from "@/experience/destinations";
import { Landing } from "@/experience/Landing";

export const metadata: Metadata = {
  title: { absolute: "ChefOS · The kitchen" },
  description: "Recipe book, food cost, journal, industry news and hotel pre-opening, in one kitchen.",
};

/** Public cinematic landing. Returning visitors (cookie) go straight to the menu; ?intro=1 replays the intro. */
export default async function Home({ searchParams }: { searchParams: Promise<{ intro?: string }> }) {
  const [{ intro }, jar] = await Promise.all([searchParams, cookies()]);
  const introSeen = intro !== "1" && jar.get(INTRO_COOKIE)?.value === "seen";
  return <Landing introSeen={introSeen} />;
}
