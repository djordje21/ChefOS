# ChefOS — Landing page and the five destinations

Status: **landing redesign v2, awaiting visual approval**. Frontend only. No migrations, no schema, auth or RLS changes. One new dependency: `@fontsource/cormorant-garamond` (OFL font, self-hosted, for the editorial serif).

## The landing (v2)

`/` is one photographic frame of a working hotel kitchen. The headline and the menu of destinations sit in the shaded left third, and the chef at the pass is the focal point right of centre:

> Your kitchen. Your craft. *Your command.*
> A professional workspace for recipes, food cost, kitchen operations, and culinary development.

There is no blocking intro. The page is usable immediately: the photograph fades in over 1.4 s and the copy rises in. Both are disabled under `prefers-reduced-motion`. The v1 scene (procedural backdrop, SVG chef, hanging tickets, intro cookie) was removed.

### Hero photograph

* Configured in `src/experience/assets.ts` (`HERO_IMAGE`): `src`, `alt`, focus point for desktop and mobile, shade strength, and `rightsCleared`.
* **Today:** a reference photo supplied for design review is in `public/experience/local/`. It is **git-ignored and never deployed**: its rights are not cleared (unknown photographer, identifiable people, a hotel logo on a jacket). Without the file, CI and every deployment show the plain dark backdrop. No other image is substituted.
* **To replace:** a licensed photograph at least 2400 px wide, with model and property releases. Put it in `public/experience/`, set `src` and `rightsCleared: true`, and tune `focus`.
* Screenshots that contain the reference photo are stored in `artifacts/review/`, which is also git-ignored.

### Layout

* **Desktop:** the photograph fills the right of the page from 24 vw. A long gradient shades it behind the text column. On short laptop screens (height ≤ 780 px) the whole menu still fits above the fold.
* **Tablet and phone (≤ 900 px):** the photograph sits on top (58 % of the screen height, cropped around the chef), with the headline and menu below it. Each destination's status moves under its description.
* **Navigation:** five numbered rows with hairline rules, in an elegant serif with sans-serif descriptions. Each row shows a short, honest status (Demo, Coming soon, Directory, Preview). Hover or keyboard focus moves the title and reveals an arrow. Focus is drawn with an accent outline.

| Order | Destination | Route | What it is now |
|---|---|---|---|
| 01 | The Recipe Book | `/recipes` | Public demo: recipe cards, reading view, new draft recipe. Fictional data, in memory only |
| 02 | Food Cost | `/food-cost` | Public demo: recipe costing, dashboard, ingredients, settings, computed by the real costing engine on fictional data |
| 03 | The Journal | `/journal`, `/journal/[slug]` | Editorial area with six categories. Every article is a **placeholder** (title, summary, outline) |
| 04 | Industry News | `/news` | Curated directory of publishers. Links only, opening the publisher's site in a new tab. No scraping, no copied articles |
| 05 | Pre-Opening | `/pre-opening` | Public introduction (12 workstreams) and an interactive demo board for a fictional hotel. Real projects stay behind sign-in (that module is not built yet) |

Every destination has "← Back to the kitchen".

### Performance

* One photograph (the reference is a 112 KB JPEG) and two font files. No video, no animation library. Only `transform` and `opacity` are animated.
* The proxy no longer calls Supabase Auth for the public paths (`/`, `/recipes`, `/food-cost`, `/journal`, `/news`, `/pre-opening`, `/demo`), so they load fast and work even when Auth is unreachable. Protected routes are unchanged.

## Placeholders, and how to replace them

| Placeholder | File | How to replace |
|---|---|---|
| Hero photograph (reference only, not in git) | `src/experience/assets.ts`, `public/experience/` | See "Hero photograph" above |
| Journal articles | `src/experience/content/journal.ts` | Change `status` to `"published"` and add `body`, `readingMinutes`, `publishedOn`. The page shows the body instead of the outline |
| CafeBar Network link | `src/experience/content/news.ts` | Set `url` once the address is confirmed. Until then the card says so and has no link |
| Pre-Opening board (fictional hotel and tasks) | `src/experience/content/preopening.ts` | Demo only. Real projects belong in a future protected module |
| Recipe Book | `src/demo/screens/RecipeBook.tsx` | Prototype on fictional data until recipes are stored (Phase 2.2+) |

## Code map

```
src/experience/
  Landing.tsx          hero: photograph, headline, destination menu
  assets.ts            hero photograph and its framing (the one place to swap it)
  experience.css       hero layout, shade, typography, responsive and reduced-motion rules
  destinations.ts      the five destinations
  SiteShell.tsx        frame for Journal / News / Pre-Opening
  nav.tsx, next-nav.tsx  router-agnostic links (Next router in the app, hash router in the hosted preview)
  pages/               Journal, News, PreOpening
  content/             journal, news, pre-opening data (all placeholder / fictional)
src/app/{page,recipes,food-cost,journal,news,pre-opening}/   thin route files
```

## Tests

* `tests/unit/experience.test.ts`: the five destinations are on public routes. Private routes (`/app`, `/account`, `/invite`, `/auth`, `/login`) are not treated as public. The Journal has exactly the six categories and only placeholder articles. News links are https publisher home pages. Pre-Opening dependencies are consistent.
* `tests/unit/demo.test.ts`: the demo module is imported only by `/recipes` and `/food-cost` (plus the preview build).
* `e2e/experience.spec.ts` (Playwright): the landing shows the headline and five destinations at once, works under reduced motion, can be used with the keyboard, and every destination opens and returns; the Recipe Book flow (open, open in Food Cost, validation, add draft, reload resets), the Journal categories and article, the News links (new tab, `noopener`), the Pre-Opening board toggle, protected `/app` still redirects to sign-in, and `/demo` redirects.
