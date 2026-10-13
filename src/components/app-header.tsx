import Link from "next/link";

export function AppHeader({ email, children }: { email?: string | null; children?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/app" className="font-semibold tracking-tight">ChefOS</Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm">{children}</div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/account/password" className="hidden text-muted hover:underline sm:inline">{email}</Link>
          <form action="/auth/signout" method="post">
            <button className="text-muted hover:text-ink hover:underline" type="submit">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
