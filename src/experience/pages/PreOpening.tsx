"use client";

import { useMemo, useState } from "react";
import { DEMO_PROJECT, DEMO_TASKS, WORKSTREAMS, type DemoTask } from "../content/preopening";
import { SiteLink } from "../nav";
import { PlaceholderTag, SiteShell } from "../SiteShell";

const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function PreOpening() {
  const [tasks, setTasks] = useState<DemoTask[]>(DEMO_TASKS);
  const [stream, setStream] = useState<string>("all");
  const done = tasks.filter((t) => t.done).length;
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const waitingOn = (t: DemoTask) => t.dependsOn.map((id) => byId.get(id)!).filter((d) => !d.done);
  const overdue = (t: DemoTask) => !t.done && t.due < DEMO_PROJECT.today;
  const shown = tasks.filter((t) => stream === "all" || t.workstream === stream).sort((a, b) => a.due.localeCompare(b.due));

  return (
    <SiteShell current="pre-opening" hero={
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80">Pre-Opening</p>
        <h1 className="display mt-2 text-3xl sm:text-5xl">From blueprint to first service</h1>
        <p className="mt-3 max-w-2xl text-white/85">Plan a hotel or restaurant opening by workstream, with owners, deadlines and dependencies, so nothing reaches opening week by surprise.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <SiteLink href="/app" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold" style={{ color: "#1d5674" }}>Open your workspace (sign in)</SiteLink>
          <a href="#demo-board" className="rounded-lg border border-white/50 px-4 py-2 text-sm font-semibold text-white">Try the demo board</a>
        </div>
      </>
    }>
      <section>
        <h2 className="display text-xl">Twelve workstreams</h2>
        <p className="mt-1 text-sm text-muted">The opening plan is organised the way a kitchen opening actually runs.</p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {WORKSTREAMS.map((w, i) => (
            <li key={w} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              <span className="num w-6 text-muted">{String(i + 1).padStart(2, "0")}</span>{w}
            </li>
          ))}
        </ol>
      </section>

      <section id="demo-board" className="mt-12 scroll-mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><h2 className="display text-xl">Demo board</h2><PlaceholderTag>Fictional demo · not saved</PlaceholderTag></div>
            <p className="mt-1 text-sm text-muted">{DEMO_PROJECT.name} · opening {fmt(DEMO_PROJECT.openingDate)} · {days(DEMO_PROJECT.today, DEMO_PROJECT.openingDate)} days to go (demo date {fmt(DEMO_PROJECT.today)})</p>
          </div>
          <div className="min-w-[14rem]">
            <div className="flex justify-between text-xs text-muted"><span>{done} of {tasks.length} tasks done</span><span className="num">{Math.round((done / tasks.length) * 100)} %</span></div>
            <div className="mt-1 h-2 rounded-full bg-surface-2"><div className="h-full rounded-full bg-ok" style={{ width: `${(done / tasks.length) * 100}%` }} /></div>
          </div>
        </div>
        <label className="mt-4 block text-sm" htmlFor="ws-filter">Workstream
          <select id="ws-filter" value={stream} onChange={(e) => setStream(e.target.value)} className="ml-2 rounded-lg border border-line-strong bg-surface px-2 py-1 text-sm">
            <option value="all">All workstreams</option>
            {WORKSTREAMS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </label>
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {shown.map((t) => {
            const blockers = waitingOn(t);
            return (
              <li key={t.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <input id={`task-${t.id}`} type="checkbox" checked={t.done} className="mt-1 h-4 w-4"
                  onChange={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} />
                <label htmlFor={`task-${t.id}`} className="min-w-0 flex-1">
                  <span className={`block font-medium ${t.done ? "text-muted line-through" : ""}`}>{t.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{t.workstream} · {t.owner} · due {fmt(t.due)}</span>
                  {!t.done && blockers.length > 0 && (
                    <span className="mt-1 block text-xs text-warn">Waiting on: {blockers.map((b) => b.title).join("; ")}</span>
                  )}
                </label>
                <span className="flex gap-1.5 text-xs">
                  {t.priority === "high" && <span className="rounded-full border border-line px-2 py-0.5 text-muted">High priority</span>}
                  {overdue(t) && <span className="rounded-full border border-danger/30 bg-danger-soft px-2 py-0.5 text-danger">Overdue</span>}
                  {t.done && <span className="rounded-full border border-ok/30 bg-ok-soft px-2 py-0.5 text-ok">Done</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-muted">The hotel, people and dates are invented. In ChefOS, real opening projects will live in your private workspace behind sign-in; that module is not built yet.</p>
      </section>
    </SiteShell>
  );
}
