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
  return (
    <>
      <AppHeader email={user.email}>
        <span className="font-medium">{workspace.name}</span>
        {workspace.kind === "demo" && <Badge tone="warn">Demo data</Badge>}
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {nav.filter((n) => n.show).map((n) => (
            <Link key={n.href} href={n.href} className="text-muted hover:text-ink">{n.label}</Link>
          ))}
        </nav>
      </AppHeader>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
