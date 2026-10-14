# ChefOS — Cinematic kitchen experience (first prototype)

Status: **for review**. Frontend only. No migrations, no schema, auth or RLS changes, no new dependencies.

## The experience

`/` opens on a dark hotel kitchen. The pass lights come up, an anonymous Executive Chef (seen from behind, no face, not a real person) appears, and the subtitle types:

> Good morning, Chef. What are we working on today?

Five kitchen tickets then slide onto the rail above the pass. Each ticket is a link to a destination.

| Order | Destination | Route | What it is now |
|---|---|---|---|
| 01 | The Recipe Book | `/recipes` | Public demo: recipe cards, reading view, new draft recipe. Fictional data, in memory only |
| 02 | Food Cost | `/food-cost` | Public demo: recipe costing, dashboard, ingredients, settings, computed by the real costing engine on fictional data |
| 03 | The Journal | `/journal`, `/journal/[slug]` | Editorial area with six categories. Every article is a **placeholder** (title, summary, outline) |
| 04 | Industry News | `/news` | Curated directory of publishers. Links only, opening the publisher's site in a new tab. No scraping, no copied articles |
| 05 | Pre-Opening | `/pre-opening` | Public introduction (12 workstreams) and an interactive demo board for a fictional hotel. Real projects stay behind sign-in (that module is not built yet) |

### Behaviour

* **Skip:** "Skip intro" button (focused on load) or **Esc**.
* **Returning visitors:** a first-party cookie `chefos_intro=seen` (1 year, no personal data) is set when the intro ends or is skipped. Next visit renders straight onto the tickets, server-side, with no flash. `/?intro=1` or the "Replay intro" button plays it again.
* **Reduced motion:** with `prefers-reduced-motion: reduce` the scene appears already lit with the tickets in place. No camera move, steam or typing.
* **Leaving:** choosing a ticket lifts it and fades to that destination's paper colour (700 ms), then navigates. Every destination has "← Back to the kitchen".
* **Responsive:** 5 tickets in a row on desktop, 3 + 2 on tablets, a single stacked column on phones (portrait backdrop below a 3:4 aspect ratio).

### Performance

* The scene is CSS + inline SVG over one WebP backdrop: 1280 px / 1920 px via `srcset`, plus a portrait crop. All four files together are **about 37 KB**, and a visitor downloads at most about 26 KB of them. There is no video and no animation library.
* Only `transform`, `opacity` and `filter` are animated.
* The proxy no longer calls Supabase Auth for the public paths (`/`, `/recipes`, `/food-cost`, `/journal`, `/news`, `/pre-opening`, `/demo`), so they load fast and work even when Auth is unreachable. Protected routes are unchanged.

## Placeholders, and how to replace them

| Placeholder | File | How to replace |
|---|---|---|
| Kitchen backdrop and brushed steel (procedural, generated) | `public/experience/*.webp`, generator `scripts/generate-experience-assets.py` | Overwrite the files with real photography under the same names, or change the paths in `src/experience/assets.ts`. Keep the backdrop dark and out of focus: the subtitle and tickets sit on it |
| Chef silhouette (inline SVG) | `src/experience/KitchenScene.tsx` (`ChefSilhouette`) | Replace with a back-view photo cut-out or illustration of an anonymous chef. Never a recognisable real person |
| Journal articles | `src/experience/content/journal.ts` | Change `status` to `"published"` and add `body`, `readingMinutes`, `publishedOn`. The page shows the body instead of the outline |
| CafeBar Network link | `src/experience/content/news.ts` | Set `url` once the address is confirmed. Until then the card says so and has no link |
| Pre-Opening board (fictional hotel and tasks) | `src/experience/content/preopening.ts` | Demo only. Real projects belong in a future protected module |
| Recipe Book | `src/demo/screens/RecipeBook.tsx` | Prototype on fictional data until recipes are stored (Phase 2.2+) |

## Code map

```
src/experience/
  Landing.tsx          intro state machine, typing, skip/replay, cookie, ticket rail
  KitchenScene.tsx     backdrop, lamps, chef silhouette, steam, pass; ticket line-art
  experience.css       scene, camera push-in, tickets, reduced-motion rules
  destinations.ts      the five destinations, chef line, cookie name
  SiteShell.tsx        frame for Journal / News / Pre-Opening
  nav.tsx, next-nav.tsx  router-agnostic links (Next router in the app, hash router in the hosted preview)
  pages/               Journal, News, PreOpening
  content/             journal, news, pre-opening data (all placeholder / fictional)
src/app/{page,recipes,food-cost,journal,news,pre-opening}/   thin route files
```

## Tests

* `tests/unit/experience.test.ts`: the five destinations are on public routes. Private routes (`/app`, `/account`, `/invite`, `/auth`, `/login`) are not treated as public. The Journal has exactly the six categories and only placeholder articles. News links are https publisher home pages. Pre-Opening dependencies are consistent.
* `tests/unit/demo.test.ts`: the demo module is imported only by `/recipes` and `/food-cost` (plus the preview build).
* `e2e/experience.spec.ts` (Playwright): the intro plays and is remembered, Skip and Esc work, `?intro=1` replays, reduced motion goes straight to the menu, every ticket opens its destination and returns, the Recipe Book flow (open, open in Food Cost, validation, add draft, reload resets), the Journal categories and article, the News links (new tab, `noopener`), the Pre-Opening board toggle, protected `/app` still redirects to sign-in, and `/demo` redirects.
