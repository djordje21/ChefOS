import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const demo = process.env.NEXT_PUBLIC_ENABLE_DEMO === "1";
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface-2 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <Link href="/" aria-label="ChefOS home"><Logo /></Link>
        <div className="max-w-md">
          <p className="eyebrow">Kitchen costing · team · outlets</p>
          <p className="display mt-3 text-[2.4rem] leading-[1.05]">
            Every gram costed.<br />Every outlet in its own lane.
          </p>
          <p className="mt-4 text-sm text-muted">
            Recipe costing with yields, sub-recipes and tax handled explicitly. Built for executive chefs, hotel F&amp;B teams and multi-outlet kitchens.
          </p>
        </div>
        <figure aria-hidden="true" className="num rounded-xl border border-line bg-surface p-4 text-xs shadow-card">
          <div className="flex justify-between text-muted"><span>CHECK 0412 · PASS</span><span>FC</span></div>
          <div className="mt-2 flex justify-between"><span>Chicken supreme, jus</span><span className="text-ok">15.7 %</span></div>
          <div className="mt-1 flex justify-between"><span>Sea bass, beurre blanc</span><span className="text-ok">24.3 %</span></div>
          <div className="mt-1 flex justify-between"><span>Mushroom risotto</span><span className="text-warn">price missing</span></div>
          <p className="mt-3 text-[0.65rem] text-muted">Illustration with fictional dishes.</p>
        </figure>
      </aside>
      <main className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block lg:hidden" aria-label="ChefOS home"><Logo /></Link>
          {children}
          {demo && (
            <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
              Just looking? <a className="font-semibold text-accent hover:underline" href="/demo">Open the interface demo</a> with fictional data. No account needed.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
