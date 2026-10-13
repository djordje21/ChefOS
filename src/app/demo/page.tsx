import { notFound } from "next/navigation";
import { DemoApp } from "@/demo/DemoApp";

export const metadata = { title: "Demo", robots: { index: false, follow: false } };

/**
 * Interface preview with fictional data. Runs entirely in the browser: no
 * Supabase calls, no auth, nothing saved. Disabled unless NEXT_PUBLIC_ENABLE_DEMO=1.
 */
export default function DemoPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO !== "1") notFound();
  return <DemoApp />;
}
