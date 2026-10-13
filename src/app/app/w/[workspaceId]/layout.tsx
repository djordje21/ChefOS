import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { user, workspace, can } = await requireWorkspace(workspaceId);
  const base = `/app/w/${workspace.id}`;
  const nav = [
    { href: base, label: "Overview", show: true },
    { href: `${base}/outlets`, label: "Outlets", show: true },
    { href: `${base}/members`, label: "Team", show: true },
    { href: `${base}/audit`, label: "Audit log", show: can("audit.view") },
  ];
  const demo = process.env.NEXT_PUBLIC_ENABLE_DEMO === "1";
  return (
    <>
      <AppHeader email={user.email}>
        <span className="display text-base">{workspace.name}</span>
        {workspace.kind === "demo" && <Badge tone="warn">Demo data</Badge>}
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {nav.filter((n) => n.show).map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-2 py-1 font-medium text-muted hover:bg-surface-2 hover:text-ink">{n.label}</Link>
          ))}
          {demo && (
            <a href="/demo" className="rounded-md px-2 py-1 font-medium text-muted hover:bg-surface-2 hover:text-ink" title="Recipe costing and ingredients are not built yet; see the interface demo with fictional data">
              Recipe costing <span className="ml-1 rounded-full border border-warn/30 bg-warn-soft px-1.5 py-0.5 text-[0.65rem] font-semibold text-warn">demo</span>
            </a>
          )}
        </nav>
      </AppHeader>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
