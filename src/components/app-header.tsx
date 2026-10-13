import Link from "next/link";
import { Logo } from "./ui";

export function AppHeader({ email, children }: { email?: string | null; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/app" aria-label="Your workspaces"><Logo /></Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm">{children}</div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/account/password" className="hidden text-muted hover:text-ink sm:inline">{email}</Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-lg px-2 py-1 font-medium text-muted hover:bg-surface-2 hover:text-ink" type="submit">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
