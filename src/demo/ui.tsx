"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Decimal } from "@/lib/costing/decimal";
import { isPlainDecimal } from "./format";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Panel({ className, title, eyebrow, actions, children }: { className?: string; title?: ReactNode; eyebrow?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className={cx("min-w-0 rounded-xl border border-line bg-surface shadow-card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="text-[0.95rem] font-semibold">{title}</h2>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

type Tone = "neutral" | "accent" | "ok" | "warn" | "bad" | "info";
const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  accent: "bg-accent-soft text-accent border-accent/25",
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-warn border-warn/30",
  bad: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
};

export function Chip({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold", toneClass[tone])}>
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  const c = { neutral: "bg-muted", accent: "bg-accent", ok: "bg-ok", warn: "bg-warn", bad: "bg-danger", info: "bg-info" }[tone];
  return <span aria-hidden="true" className={cx("inline-block h-2 w-2 shrink-0 rounded-full", c)} />;
}

/** Marks what a screen really is: working, engine-backed, or a visual prototype. */
export function StatusTag({ kind }: { kind: "working" | "engine" | "prototype" }) {
  if (kind === "working") return <Chip tone="ok" title="Implemented, persisted and covered by tests in the real app">Working</Chip>;
  if (kind === "engine") return <Chip tone="info" title="Numbers come from the real costing engine; data is fictional and not saved">Live engine · demo data</Chip>;
  return <Chip tone="warn" title="Visual prototype on fictional data; not saved">Prototype</Chip>;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  const v = {
    primary: "bg-accent text-accent-ink hover:brightness-110",
    secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
    ghost: "text-muted hover:bg-surface-2 hover:text-ink",
    danger: "text-danger hover:bg-danger-soft",
  }[variant];
  const s = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm";
  return <button type="button" className={cx("inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-50", v, s, className)} {...props} />;
}

export const inputClass =
  "rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";

/** Full width unless the caller sets its own width. */
const width = (className?: string) => (className && /(^|\s)(w-|flex-1|max-w-)/.test(className) ? "" : "w-full");

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, width(props.className), props.className)} />;
}

export function SelectInput(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, width(props.className), props.className)} />;
}

/**
 * Decimal entry that commits only valid plain decimals (no exponents, commas or
 * negatives). With `percent`, the user types 31 and the value committed is "0.31".
 */
export function DecimalField({
  value, onCommit, percent = false, allowZero = true, max, suffix, prefix, label, className, inputClassName, id,
}: {
  value: string;
  onCommit: (v: string) => void;
  percent?: boolean;
  allowZero?: boolean;
  max?: string;
  suffix?: string;
  prefix?: string;
  label: string;
  className?: string;
  inputClassName?: string;
  id: string;
}) {
  const shown = percent ? new Decimal(value).times(100).toString() : value;
  const [draft, setDraft] = useState(shown);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(shown);
  if (synced !== shown) {
    // The value changed from outside (e.g. "Use suggested price"): show it.
    setSynced(shown);
    setDraft(shown);
  }

  const commit = () => {
    const t = draft.trim().replace(",", ".");
    if (!isPlainDecimal(t)) return setError("Enter a number like 12.5");
    const d = new Decimal(t);
    if (!allowZero && d.isZero()) return setError("Must be greater than 0");
    if (max && d.gt(max)) return setError(`At most ${max}`);
    setError(null);
    const out = percent ? d.dividedBy(100).toString() : d.toString();
    if (out !== value) onCommit(out);
  };

  return (
    <span className={cx("relative block", className)}>
      <span className="sr-only">{label}</span>
      <span className={cx("flex items-center rounded-lg border bg-surface transition focus-within:ring-2", error ? "border-danger focus-within:ring-danger/25" : "border-line-strong focus-within:border-accent focus-within:ring-accent/25")}>
        {prefix && <span className="pl-2 text-xs text-muted">{prefix}</span>}
        <input
          id={id}
          aria-label={label}
          aria-invalid={!!error}
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(shown); setError(null); }
          }}
          className={cx("num w-full min-w-0 bg-transparent px-2 py-1.5 text-right text-sm text-ink outline-none focus-visible:outline-none", inputClassName)}
        />
        {suffix && <span className="pr-2 text-xs text-muted">{suffix}</span>}
      </span>
      {error && <span role="alert" className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-danger px-1.5 py-0.5 text-[0.7rem] text-surface">{error}</span>}
    </span>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-card">
      <p className="eyebrow flex items-center gap-1.5">{tone && <Dot tone={tone} />}{label}</p>
      <p className="num mt-2 text-2xl font-medium">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
