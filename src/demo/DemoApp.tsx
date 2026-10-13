"use client";

import { useEffect, type ReactNode } from "react";
import { About } from "./screens/About";
import { Dashboard } from "./screens/Dashboard";
import { Ingredients } from "./screens/Ingredients";
import { RecipeCosting } from "./screens/RecipeCosting";
import { Settings } from "./screens/Settings";
import { DemoProvider, useDemo, type Screen } from "./store";
import { Button, SelectInput, cx } from "./ui";

const NAV: { screen: Screen; label: string; icon: ReactNode }[] = [
  { screen: "dashboard", label: "Dashboard", icon: <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z" /> },
  { screen: "recipes", label: "Recipe costing", icon: <path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h5" /> },
  { screen: "ingredients", label: "Ingredients", icon: <path d="M4 7h16M4 12h16M4 17h10" /> },
  { screen: "settings", label: "Settings", icon: <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zM19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4z" /> },
  { screen: "about", label: "What works?", icon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8h.01M11 12h1v5h1" /> },
];

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
        <rect x="2" y="3" width="20" height="3" rx="1.5" fill="var(--accent)" />
        <path d="M6 6v13.5l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5V6" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 10h6M9 13h4" stroke="var(--muted)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="display text-lg">ChefOS</span>
    </span>
  );
}

function Shell() {
  const { state, ws, dispatch } = useDemo();

  useEffect(() => {
    if (!state.notice) return;
    const t = setTimeout(() => dispatch({ type: "notice", text: null }), 4000);
    return () => clearTimeout(t);
  }, [state.notice, dispatch]);

  const screen = {
    dashboard: <Dashboard />,
    recipes: <RecipeCosting />,
    ingredients: <Ingredients />,
    settings: <Settings />,
    about: <About />,
  }[state.screen];

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="border-b border-warn/30 bg-warn-soft px-4 py-1.5 text-center text-xs text-warn">
        <strong className="font-semibold">Demo mode</strong> · fictional restaurants, suppliers, prices and recipes · nothing is saved ·{" "}
        <button className="font-semibold underline underline-offset-2" onClick={() => dispatch({ type: "reset" })}>Reset demo data</button>
      </div>
      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 lg:block lg:space-y-5 lg:py-5">
            <Logo />
            <div className="flex min-w-0 flex-1 flex-wrap gap-2 lg:block lg:space-y-2">
              <label className="min-w-[10rem] flex-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted" htmlFor="ws-switch">
                Workspace
                <SelectInput id="ws-switch" className="mt-1 text-sm font-medium normal-case tracking-normal" value={state.workspaceId}
                  onChange={(e) => dispatch({ type: "workspace", id: e.target.value })}>
                  {state.workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </SelectInput>
              </label>
              <label className="min-w-[10rem] flex-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted" htmlFor="outlet-switch">
                Outlet
                <SelectInput id="outlet-switch" className="mt-1 text-sm font-medium normal-case tracking-normal" value={state.outletId}
                  onChange={(e) => dispatch({ type: "outlet", id: e.target.value })}>
                  <option value="all">All outlets</option>
                  {ws.outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </SelectInput>
              </label>
              <p className="hidden text-xs text-muted lg:block">Signed in as <span className="text-ink">Demo user</span> · {ws.role}</p>
            </div>
            <nav aria-label="Main" className="flex w-full gap-1 overflow-x-auto lg:block lg:space-y-0.5">
              {NAV.map((n) => (
                <button key={n.screen} onClick={() => dispatch({ type: "go", screen: n.screen })} aria-current={state.screen === n.screen ? "page" : undefined}
                  className={cx(
                    "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition lg:w-full",
                    state.screen === n.screen ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-ink",
                  )}>
                  <Icon>{n.icon}</Icon>{n.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>
        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7" key={ws.id}>
          {screen}
        </main>
      </div>
      {state.notice && (
        <div role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-surface px-4 py-2 text-sm shadow-card" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {state.notice} <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "notice", text: null })}>Dismiss</Button>
        </div>
      )}
    </div>
  );
}

export function DemoApp() {
  return (
    <DemoProvider>
      <Shell />
    </DemoProvider>
  );
}
