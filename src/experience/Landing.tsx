"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { CHEF_LINE, DESTINATIONS, INTRO_COOKIE, type Destination } from "./destinations";
import { KitchenScene, TicketMotif } from "./KitchenScene";
import { SiteLink, useNavigate } from "./nav";
import "./experience.css";

type Phase = "dark" | "lights" | "chef" | "line" | "menu";

function rememberIntroSeen() {
  try {
    document.cookie = `${INTRO_COOKIE}=seen; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookies blocked: the intro simply plays again next time.
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Intro timeline in ms. The whole sequence takes about 6 s and can be skipped at any point. */
const TIMELINE: [Phase, number][] = [["lights", 350], ["chef", 1700], ["line", 2700]];
const TYPE_MS = 34;

export function Landing({ introSeen }: { introSeen: boolean }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>(introSeen ? "menu" : "dark");
  const [typed, setTyped] = useState(introSeen ? CHEF_LINE.length : 0);
  const [leaving, setLeaving] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTyped(CHEF_LINE.length);
    setPhase("menu");
    rememberIntroSeen();
  }, []);

  // Play the intro (or jump to the menu for returning visitors and reduced motion).
  useEffect(() => {
    if (introSeen) return;
    if (prefersReducedMotion()) {
      const t = setTimeout(finish, 0);
      return () => clearTimeout(t);
    }
    timers.current = TIMELINE.map(([p, at]) => setTimeout(() => setPhase(p), at));
    return () => timers.current.forEach(clearTimeout);
  }, [introSeen, finish]);

  // Type the chef's line, then reveal the tickets.
  useEffect(() => {
    if (phase !== "line") return;
    if (typed >= CHEF_LINE.length) {
      const t = setTimeout(finish, 650);
      return () => clearTimeout(t);
    }
    const pause = CHEF_LINE[typed - 1] === "." ? 420 : TYPE_MS;
    const t = setTimeout(() => setTyped((n) => n + 1), pause);
    return () => clearTimeout(t);
  }, [phase, typed, finish]);

  // Esc skips the intro.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase !== "menu" && finish();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, finish]);

  const choose = (d: Destination) => {
    if (leaving) return;
    rememberIntroSeen();
    if (prefersReducedMotion()) return navigate(d.href);
    setLeaving(d.id);
    setTimeout(() => navigate(d.href), 700);
  };

  const replay = () => {
    setLeaving(null);
    setTyped(0);
    setPhase("dark");
    if (prefersReducedMotion()) return finish();
    timers.current = TIMELINE.map(([p, at]) => setTimeout(() => setPhase(p), at));
  };

  const chosen = DESTINATIONS.find((d) => d.id === leaving);

  return (
    <div className="xp xp-letterbox" data-phase={phase} data-leaving={leaving ?? undefined}>
      <KitchenScene />
      <div className="xp-fade" style={{ background: chosen?.paper ?? "#000" }} />

      <div className="xp-ui">
        <header className="xp-topbar">
          <span className="xp-wordmark">ChefOS</span>
          <nav className="flex items-center gap-2">
            {phase === "menu" ? (
              <button type="button" className="xp-btn" onClick={replay}>Replay intro</button>
            ) : (
              <button type="button" className="xp-btn" onClick={finish} autoFocus>Skip intro</button>
            )}
            <SiteLink href="/login" className="xp-btn">Sign in</SiteLink>
          </nav>
        </header>

        <section className="xp-subtitle" aria-live="polite">
          <p className="xp-speaker">Executive Chef</p>
          <p className="xp-line">
            <span className="sr-only">{CHEF_LINE}</span>
            <span aria-hidden="true">
              {CHEF_LINE.slice(0, typed)}
              {phase === "line" && <span className="xp-caret" />}
            </span>
          </p>
        </section>

        <nav aria-label="Choose where to work" className="xp-rail">
          {DESTINATIONS.map((d, i) => (
            <SiteLink
              key={d.id}
              href={d.href}
              className="xp-ticket"
              data-chosen={leaving === d.id ? "" : undefined}
              tabIndex={phase === "menu" ? 0 : -1}
              aria-hidden={phase !== "menu"}
              onClick={(e) => {
                e.preventDefault();
                choose(d);
              }}
              style={{ "--ink": d.ink, "--paper": d.paper, "--delay": `${0.08 * i}s`, "--tilt": `${[-1.4, 0.8, -0.6, 1.2, -0.9][i]}deg` } as CSSProperties}
            >
              <span className="xp-ticket-clip" aria-hidden="true" />
              <span className="xp-ticket-head"><span>Order {d.order}</span><span>Pass</span></span>
              <span className="xp-ticket-title">{d.title}</span>
              <span className="xp-ticket-line">{d.line}</span>
              <span className="xp-ticket-motif"><TicketMotif id={d.id} /></span>
              <span className="xp-ticket-status" style={{ color: d.ink }}>{d.statusLabel}</span>
            </SiteLink>
          ))}
        </nav>
        <p className="xp-footnote">Preview scene with temporary visuals. Demo areas use fictional data only.</p>
      </div>
    </div>
  );
}
