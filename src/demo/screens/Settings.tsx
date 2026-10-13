"use client";

import { useState } from "react";
import { costingPolicySchema, type CostingPolicyInput } from "@/lib/costing/schema";
import { Decimal } from "@/lib/costing/decimal";
import { date, money, pct, qty } from "../format";
import { DEMO_TODAY, currentPolicy } from "../model";
import { useDemo } from "../store";
import { Button, Chip, DecimalField, Panel, SelectInput, StatusTag, TextInput } from "../ui";

export function Settings() {
  const { ws, dispatch } = useDemo();
  const active = currentPolicy(ws);
  const nextVersion = Math.max(...ws.policies.map((p) => p.version)) + 1;
  const [draft, setDraft] = useState<CostingPolicyInput>({ ...active, version: nextVersion, validFrom: DEMO_TODAY });
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<CostingPolicyInput>) => { setDraft({ ...draft, ...patch }); setSaved(false); };
  const save = () => {
    const r = costingPolicySchema.safeParse({ ...draft, version: nextVersion });
    const problems = r.success ? [] : r.error.issues.map((i) => `${i.path.join(".") || "rule"}: ${i.message}`);
    if (ws.policies.some((p) => p.validFrom === draft.validFrom)) problems.push(`A version already starts on ${draft.validFrom}. Choose another date.`);
    if (draft.validFrom > DEMO_TODAY) problems.push("This preview only applies versions that are already in force; choose today or an earlier date.");
    setErrors(problems);
    if (problems.length === 0) {
      dispatch({ type: "policy", policy: { ...draft, version: nextVersion } });
      setDraft({ ...draft, version: nextVersion + 1 });
      setSaved(true);
    }
  };

  const allowanceRate = draft.allowance.mode === "none" ? "0" : String(draft.allowance.rate);
  const roundingStep = draft.rounding.mode === "none" ? "0.5" : String(draft.rounding.step);
  const cur = active.currency;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{ws.name}</p>
          <h1 className="display mt-1 text-2xl sm:text-[1.7rem]">Workspace settings</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Every rule below belongs to this workspace only. ChefOS assumes none of them: a new workspace starts empty and chooses its own.</p>
        </div>
        <StatusTag kind="prototype" />
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel eyebrow="Costing rules" title={`New version ${nextVersion}`} actions={<Chip tone="info">In force: v{active.version} since {date(active.validFrom)}</Chip>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm" htmlFor="pol-basis">Recipe quantities are entered as
              <SelectInput id="pol-basis" className="mt-1" value={draft.defaultQuantityBasis} onChange={(e) => set({ defaultQuantityBasis: e.target.value as "net" | "gross" })}>
                <option value="net">Net (usable) quantities</option>
                <option value="gross">Gross (as purchased)</option>
              </SelectInput>
              <span className="mt-1 block text-xs text-muted">Net: yield is applied to find the purchased quantity. Gross: no yield applied. Each line can override this.</span>
            </label>
            <label className="text-sm" htmlFor="pol-entry">Menu prices are entered
              <SelectInput id="pol-entry" className="mt-1" value={draft.menuPriceEntry} onChange={(e) => set({ menuPriceEntry: e.target.value as CostingPolicyInput["menuPriceEntry"] })}>
                <option value="tax_inclusive">Including tax (guest price)</option>
                <option value="tax_exclusive">Excluding tax (net price)</option>
              </SelectInput>
              <span className="mt-1 block text-xs text-muted">Food cost is always calculated on the net price.</span>
            </label>
            <label className="flex items-start gap-2 text-sm sm:col-span-2" htmlFor="pol-recoverable">
              <input id="pol-recoverable" type="checkbox" className="mt-1" checked={draft.inputTaxRecoverable} onChange={(e) => set({ inputTaxRecoverable: e.target.checked })} />
              <span>Purchase tax is recoverable<span className="block text-xs text-muted">If on, tax included in supplier prices is removed from costs. If off (not tax-registered), tax is part of the cost.</span></span>
            </label>
            <div className="text-sm">Minor-ingredient allowance
              <div className="mt-1 flex gap-2">
                <SelectInput id="pol-allow-mode" aria-label="Allowance" className="flex-1" value={draft.allowance.mode}
                  onChange={(e) => set({ allowance: e.target.value === "none" ? { mode: "none" } : { mode: "percent_of_ingredient_cost", rate: allowanceRate === "0" ? "0.02" : allowanceRate } })}>
                  <option value="none">None</option>
                  <option value="percent_of_ingredient_cost">% of cost</option>
                </SelectInput>
                {draft.allowance.mode !== "none" && (
                  <DecimalField id="pol-allow-rate" label="Allowance percent" percent max="99" suffix="%" value={allowanceRate} className="w-24"
                    onCommit={(v) => set({ allowance: { mode: "percent_of_ingredient_cost", rate: v } })} />
                )}
              </div>
              <span className="mt-1 block text-xs text-muted">Covers salt, oil, herbs not listed in recipes. Applied once per dish, never inside sub-recipes.</span>
            </div>
            <div className="text-sm">Suggested price rounding
              <div className="mt-1 flex gap-2">
                <SelectInput id="pol-round-mode" aria-label="Rounding mode" className="flex-1" value={draft.rounding.mode}
                  onChange={(e) => set({ rounding: e.target.value === "none" ? { mode: "none" } : { mode: e.target.value as "up", step: roundingStep } })}>
                  <option value="none">No rounding</option>
                  <option value="up">Round up</option>
                  <option value="half_up">Round to nearest</option>
                  <option value="down">Round down</option>
                  <option value="half_even">Nearest, ties to even</option>
                </SelectInput>
                {draft.rounding.mode !== "none" && (
                  <DecimalField id="pol-round-step" label="Rounding step" allowZero={false} prefix={cur} value={roundingStep} className="w-28"
                    onCommit={(v) => set({ rounding: { mode: draft.rounding.mode as "up", step: v } })} />
                )}
              </div>
              <span className="mt-1 block text-xs text-muted">“Round up” keeps every suggestion at or below the target food cost.</span>
            </div>
            <label className="text-sm" htmlFor="pol-from">Valid from
              <TextInput id="pol-from" type="date" className="mt-1" value={draft.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />
              <span className="mt-1 block text-xs text-muted">Past calculations keep the version that applied at the time.</span>
            </label>
          </div>
          {errors.length > 0 && <ul role="alert" className="mt-4 space-y-1 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          {saved && <p role="status" className="mt-4 rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">Saved as version {nextVersion - 1}. Every recipe and dish was recalculated.</p>}
          <div className="mt-4 flex gap-2"><Button onClick={save}>Save as version {nextVersion}</Button></div>
        </Panel>

        <div className="space-y-5">
          <Panel eyebrow="History" title="Costing rule versions">
            <ol className="space-y-2 text-sm">
              {[...ws.policies].sort((a, b) => b.version - a.version).map((p) => (
                <li key={p.version} className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2">
                  <div>
                    <p className="font-semibold">Version {p.version} {p.version === active.version && <Chip tone="ok">In force</Chip>}</p>
                    <p className="text-xs text-muted">
                      {p.defaultQuantityBasis} · tax {p.inputTaxRecoverable ? "recoverable" : "not recoverable"} · menu {p.menuPriceEntry === "tax_inclusive" ? "incl." : "excl."} tax ·
                      {p.allowance.mode === "none" ? " no allowance" : ` allowance ${pct(p.allowance.rate as string)}`} ·
                      {p.rounding.mode === "none" ? " no rounding" : ` ${p.rounding.mode.replace("_", "-")} ${money(p.rounding.step as string, cur, ws.locale)}`}
                    </p>
                  </div>
                  <span className="num shrink-0 text-xs text-muted">{date(p.validFrom)}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel eyebrow="Tax" title="Menu tax rate">
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm">{ws.menuTaxRate.name}</p>
              <DecimalField id="menu-tax" label="Menu tax rate percent" percent max="99" suffix="%" value={ws.menuTaxRate.rate} className="w-24"
                onCommit={(v) => dispatch({ type: "menuTax", rate: v })} />
            </div>
            <p className="mt-2 text-xs text-muted">Kept separate from food cost: food cost % is always calculated on the price excluding this tax.</p>
          </Panel>

          <Panel eyebrow="Targets" title="Food-cost targets by menu category">
            <ul className="space-y-2">
              {ws.categories.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
                  <span>{c.name}</span>
                  <DecimalField id={`target-${c.name}`} label={`${c.name} target percent`} percent max="99" suffix="%" value={c.target} className="w-24"
                    onCommit={(v) => !new Decimal(v).isZero() && dispatch({ type: "categoryTarget", name: c.name, target: v })} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">A dish can override its category target.</p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Units" title="Units of measure">
          <div className="flex flex-wrap gap-1.5">
            {ws.units.map((u) => <Chip key={u.code}>{u.code} · {u.dimension}{u.dimension !== "count" && u.toBase !== "1" ? ` · ${qty(String(u.toBase))} ${u.dimension === "mass" ? "g" : "ml"}` : ""}</Chip>)}
          </div>
          <p className="mt-2 text-xs text-muted">Pieces never turn into grams or millilitres by themselves: each ingredient defines its own conversion (e.g. 1 egg = 58 g).</p>
        </Panel>
        <Panel eyebrow="Workspace" title={ws.name}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted">Base currency</dt><dd>{cur} <span className="text-xs text-muted">(fixed at creation)</span></dd>
            <dt className="text-muted">Exchange rates</dt><dd>{ws.exchangeRates.length ? ws.exchangeRates.map((r) => `1 ${r.currency} = ${r.rateToBase} ${cur}`).join(", ") : "None"}</dd>
            <dt className="text-muted">Outlets</dt><dd>{ws.outlets.map((o) => o.name).join(" · ")}</dd>
            <dt className="text-muted">Your role</dt><dd>{ws.role}</dd>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
