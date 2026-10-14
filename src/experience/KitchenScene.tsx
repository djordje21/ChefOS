import { EXPERIENCE_ASSETS } from "./assets";

/** Anonymous executive chef, seen from behind and slightly to the side, rim-lit by the pass lamps. */
function ChefSilhouette() {
  return (
    <svg className="xp-chef" viewBox="0 0 400 700" aria-hidden="true">
      <defs>
        <linearGradient id="xp-jacket" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#14110e" />
          <stop offset="0.62" stopColor="#2a241f" />
          <stop offset="1" stopColor="#5a4632" />
        </linearGradient>
        <linearGradient id="xp-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.55" stopColor="#ffb36b" stopOpacity="0" />
          <stop offset="1" stopColor="#ffc98f" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="xp-head" cx="0.7" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#3b2f25" />
          <stop offset="1" stopColor="#100d0b" />
        </radialGradient>
        <linearGradient id="xp-toque" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5d574f" />
          <stop offset="0.7" stopColor="#8f8679" />
          <stop offset="1" stopColor="#c9b59a" />
        </linearGradient>
        <filter id="xp-soft"><feGaussianBlur stdDeviation="1.4" /></filter>
        <filter id="xp-glow"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <g filter="url(#xp-soft)">
        {/* body: broad shoulders, double-breasted jacket, arm resting toward the pass */}
        <path
          d="M150 196 C110 204 70 216 56 244 C42 272 38 320 40 380 L48 520 C52 570 60 620 66 700 L334 700 C340 620 348 570 352 520 L360 380 C362 320 358 272 344 244 C330 216 290 204 250 196 C236 206 222 210 200 210 C178 210 164 206 150 196 Z"
          fill="url(#xp-jacket)"
        />
        {/* arms hanging at the sides */}
        <path d="M84 262 C80 340 82 420 92 500 M316 262 C320 340 318 420 308 500" stroke="#0c0a08" strokeWidth="5" fill="none" opacity="0.7" />
        {/* collar */}
        <path d="M150 196 C166 214 182 220 200 220 C218 220 236 214 252 196 L246 186 C232 198 218 202 200 202 C182 202 168 198 156 186 Z" fill="#3a322b" />
        {/* apron ties */}
        <path d="M58 470 C140 482 262 482 356 468" stroke="#1d1915" strokeWidth="9" fill="none" />
        <path d="M196 476 c-18 6 -26 22 -20 40 M204 476 c16 8 22 24 14 42" stroke="#241f1a" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* neck and head, short hair */}
        <path d="M178 150 L178 198 L224 198 L224 150 Z" fill="#1a1512" />
        <ellipse cx="202" cy="106" rx="54" ry="64" fill="url(#xp-head)" />
        {/* pleated toque */}
        <path d="M154 74 L156 46 C130 40 124 10 150 4 C160 -4 182 0 190 6 C200 -2 222 -2 232 6 C246 0 268 6 266 22 C276 34 262 48 250 46 L252 74 C226 66 180 66 154 74 Z" fill="url(#xp-toque)" />
        <path d="M156 46 C186 40 222 40 250 46 M180 44 L178 70 M204 42 L204 68 M228 44 L230 70" stroke="#5a534a" strokeWidth="2" fill="none" />
      </g>
      {/* warm rim light on the lamp side */}
      <g filter="url(#xp-glow)" opacity="0.85">
        <path d="M250 196 C290 204 330 216 344 244 C358 272 362 320 360 380 M256 60 C262 80 262 120 252 150 M360 380 L352 520 C350 540 349 550 348 560" stroke="url(#xp-rim)" strokeWidth="6" fill="none" />
      </g>
    </svg>
  );
}

function Lamp({ left }: { left: string }) {
  return (
    <div className="xp-lamp" style={{ left }}>
      <svg viewBox="0 0 100 160" aria-hidden="true" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="xp-shade" x1="0" x2="1">
            <stop offset="0" stopColor="#1b1714" />
            <stop offset="0.45" stopColor="#5b524a" />
            <stop offset="0.6" stopColor="#2b2520" />
            <stop offset="1" stopColor="#0f0d0b" />
          </linearGradient>
          <radialGradient id="xp-bulb" cx="0.5" cy="0.2" r="0.7">
            <stop offset="0" stopColor="#fff2d8" />
            <stop offset="0.5" stopColor="#ffb466" />
            <stop offset="1" stopColor="#c46a28" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="48.5" y="0" width="3" height="88" fill="#2b2622" />
        <path d="M38 88 L62 88 L88 140 Q50 150 12 140 Z" fill="url(#xp-shade)" />
        <ellipse cx="50" cy="141" rx="37" ry="7" fill="url(#xp-bulb)" />
      </svg>
      <div className="xp-lamp-glow" />
    </div>
  );
}

export function KitchenScene() {
  const a = EXPERIENCE_ASSETS;
  return (
    <div className="xp-camera" aria-hidden="true">
      <picture>
        <source media="(max-aspect-ratio: 3/4)" srcSet={a.backdrop.portrait} />
        <img className="xp-backdrop" src={a.backdrop.src} srcSet={a.backdrop.srcSet} sizes="100vw" alt="" decoding="async" fetchPriority="high" />
      </picture>
      <div className="xp-lamps">
        <Lamp left="30%" />
        <Lamp left="52%" />
        <Lamp left="74%" />
      </div>
      <ChefSilhouette />
      <div>
        <span className="xp-steam" style={{ left: "28%" }} />
        <span className="xp-steam" />
        <span className="xp-steam" />
      </div>
      <div className="xp-pass" style={{ backgroundImage: `url(${a.steel})` }} />
    </div>
  );
}

/** Line-art motif printed on each destination ticket. */
export function TicketMotif({ id }: { id: string }) {
  const common = { width: "100%", height: 56, viewBox: "0 0 160 56", fill: "none", stroke: "currentColor", strokeWidth: 1.4, "aria-hidden": true } as const;
  switch (id) {
    case "recipes":
      return (
        <svg {...common}>
          <path d="M20 10 Q50 4 80 12 Q110 4 140 10 L140 48 Q110 42 80 50 Q50 42 20 48 Z" />
          <path d="M80 12 V50 M30 20 h36 M30 27 h30 M30 34 h34 M94 20 h36 M94 27 h28" />
          <path d="M112 10 v22 l5 -4 l5 4 v-22" />
        </svg>
      );
    case "food-cost":
      return (
        <svg {...common}>
          <path d="M28 44 h104 l-8 -10 h-88 Z" />
          <rect x="52" y="8" width="56" height="20" rx="2" />
          <text x="80" y="22.5" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none" fontFamily="var(--font-mono)">0.230 kg</text>
          <path d="M80 28 v6" />
        </svg>
      );
    case "journal":
      return (
        <svg {...common}>
          <path d="M18 14 h70 M18 22 h86 M18 30 h78 M18 38 h60" />
          <path d="M130 8 l10 10 l-22 28 l-12 4 l3 -12 Z M116 42 l6 -8" />
        </svg>
      );
    case "news":
      return (
        <svg {...common}>
          <rect x="22" y="8" width="104" height="42" />
          <path d="M126 16 h12 v30 a4 4 0 0 1 -8 0 v-30" />
          <path d="M30 16 h56 M30 22 h56" strokeWidth="3" />
          <path d="M30 30 h24 M30 36 h24 M30 42 h24 M62 30 h56 M62 36 h56 M62 42 h40" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 8 h136 v42 h-136 Z" strokeDasharray="2 3" />
          <path d="M24 16 h50 v26 h-50 Z M74 16 h40 v14 h-40 M114 16 h24 v26 h-34 M88 30 v12" />
          <circle cx="44" cy="29" r="5" />
        </svg>
      );
  }
}
