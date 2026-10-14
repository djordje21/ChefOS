import type { CSSProperties } from "react";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import { HERO_IMAGE } from "./assets";
import { DESTINATIONS } from "./destinations";
import { SiteLink } from "./nav";
import "./experience.css";

/**
 * Public landing: one photographic frame of a working hotel kitchen, with the
 * headline and the five destinations set in the shaded left third.
 */
export function Landing({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const style = {
    "--hero-src": `url("${HERO_IMAGE.src}")`,
    "--hero-focus": HERO_IMAGE.focus.desktop,
    "--hero-focus-mobile": HERO_IMAGE.focus.mobile,
    "--hero-shade": HERO_IMAGE.shade,
  } as CSSProperties;

  return (
    <div className="xp" data-tone={tone} style={style}>
      <div className="xp-photo" role="img" aria-label={HERO_IMAGE.alt} />
      <div className="xp-shade" aria-hidden="true" />

      <header className="xp-top">
        <span className="xp-wordmark">ChefOS</span>
        <SiteLink href="/login" className="xp-signin">Sign in</SiteLink>
      </header>

      <main className="xp-content">
        <h1 className="xp-headline">
          <span>Your kitchen.</span> <span>Your craft.</span> <em>Your command.</em>
        </h1>
        <p className="xp-lede">A professional workspace for recipes, food cost, kitchen operations, and culinary development.</p>

        <nav aria-label="ChefOS destinations" className="xp-nav">
          <ol>
            {DESTINATIONS.map((d) => (
              <li key={d.id}>
                <SiteLink href={d.href} className="xp-dest">
                  <span className="xp-dest-num" aria-hidden="true">{d.number}</span>
                  <span className="xp-dest-text">
                    <span className="xp-dest-title">{d.title}</span>
                    <span className="xp-dest-line">{d.line}</span>
                  </span>
                  <span className="xp-dest-status">{d.statusLabel}</span>
                  <span className="xp-dest-arrow" aria-hidden="true">→</span>
                </SiteLink>
              </li>
            ))}
          </ol>
        </nav>
      </main>

      {!HERO_IMAGE.rightsCleared && (
        <p className="xp-credit">Reference photograph for design review only · not for publication</p>
      )}
    </div>
  );
}
