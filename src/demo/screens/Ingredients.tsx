"use client";

import { useMemo, useState } from "react";
import type { DemoIngredient, DemoPrice } from "../data";
import { date, money, pct, qty } from "../format";
import { evaluate, recipesUsing, usableCostPer } from "../model";
import { useDemo } from "../store";
import { Button, Chip, DecimalField, Panel, SelectInput, StatusTag, TextInput, cx } from "../ui";

export function Ingredients() {
  const { state, ws, evaluation, dispatch } = useDemo();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"all" | "missing" | "changed">("all");
  const categories = [...new Set(ws.ingredients.map((i) => i.category))].sort();
  const selected = ws.ingredients.find((i) => i.id === state.ingredientId) ?? null;

  if (!evaluation.ok) return <Panel title="Calculation stopped"><p className="text-sm text-danger">{evaluation.error}</p></Panel>;
  const policy = evaluation.policy;

  const rows = ws.ingredients
    .filter((i) => category === "all" || i.category === category)
    .filter((i) => view === "all" || (view === "missing" ? !i.price : !!i.previousPrice))
    .filter((i) => `${i.name} ${i.supplier ?? ""} ${i.supplierCode ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{ws.name} · shared by all outlets</p>
          <h1 className="display mt-1 text-2xl sm:text-[1.7rem]">Ingredient master</h1>
          <p className="mt-1 text-sm text-muted">{ws.ingredients.length} ingredients · purchase prices {policy.inputTaxRecoverable ? "net of recoverable tax" : "including non-recoverable tax"} · costs per usable unit after yield</p>
        </div>
        <StatusTag kind="prototype" />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <TextInput id="ing-search" placeholder="Search name, supplier or code" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" aria-label="Search ingredients" />
        <SelectInput id="ing-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-48" aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </SelectInput>
        <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs" role="tablist" aria-label="View">
          {([["all", "All"], ["missing", "Missing price"], ["changed", "Price changed"]] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
              className={cx("rounded-md px-2.5 py-1 font-semibold", view === k ? "bg-surface text-ink shadow-card" : "text-muted")}>{label}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[0.7rem] uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 font-semibold">Ingredient</th>
                <th className="px-2 py-2.5 font-semibold">Supplier</th>
                <th className="px-2 py-2.5 text-right font-semibold">Purchase price</th>
                <th className="px-2 py-2.5 text-right font-semibold">Yield</th>
                <th className="px-2 py-2.5 text-right font-semibold" title="Purchase cost divided by yield">Usable cost</th>
                <th className="px-2 py-2.5 font-semibold">Updated</th>
                <th className="px-3 py-2.5 text-right font-semibold">Used in</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const usable = usableCostPer(i, ws, policy);
                const used = recipesUsing(ws, i.id).length;
                const change = i.previousPrice && i.price ? Number(i.price.amount) / Number(i.previousPrice.amount) - 1 : null;
                return (
                  <tr key={i.id} onClick={() => dispatch({ type: "go", screen: "ingredients", ingredientId: i.id })}
                    className={cx("cursor-pointer border-b border-line/70 last:border-0 hover:bg-surface-2", selected?.id === i.id && "bg-accent-soft")}>
                    <td className="px-3 py-2.5">
                      <button className="text-left font-medium hover:text-accent">{i.name}</button>
                      <p className="text-xs text-muted">{i.category}</p>
                    </td>
                    <td className="px-2 py-2.5"><p>{i.supplier ?? "—"}</p><p className="num text-xs text-muted">{i.supplierCode ?? ""}</p></td>
                    <td className="px-2 py-2.5 text-right">
                      {i.price ? (
                        <>
                          <p className="num">{money(i.price.amount, i.price.currency, ws.locale)}</p>
                          <p className="text-xs text-muted">per {qty(i.price.packQuantity)} {i.price.packUnit}{i.price.taxIncluded ? ` · incl. ${pct(i.price.taxRate, 0)} tax` : ""}</p>
                        </>
                      ) : <Chip tone="bad">Missing price</Chip>}
                    </td>
                    <td className="num px-2 py-2.5 text-right">{pct(i.yieldRate, 0)}</td>
                    <td className="num px-2 py-2.5 text-right">{usable ? `${money(usable.value, policy.currency, ws.locale)} / ${usable.unit}` : "—"}</td>
                    <td className="px-2 py-2.5">
                      <p className="text-xs">{date(i.priceUpdated)}</p>
                      {change !== null && <Chip tone={change > 0 ? "bad" : "ok"}>{change > 0 ? "+" : ""}{pct(change)}</Chip>}
                    </td>
                    <td className="num px-3 py-2.5 text-right">{used || <span className="text-muted">0</span>}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-muted">No ingredients match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {selected && (
          <div className="fixed inset-0 z-40 flex justify-end bg-ink/25" onClick={() => dispatch({ type: "go", screen: "ingredients", ingredientId: null })}>
            <div className="h-full w-full max-w-md overflow-y-auto bg-canvas p-3 shadow-card" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Edit ${selected.name}`}>
              <IngredientEditor key={selected.id} ingredient={selected} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IngredientEditor({ ingredient }: { ingredient: DemoIngredient }) {
  const { ws, evaluation, dispatch } = useDemo();
  const blank: DemoPrice = { amount: "0", currency: evaluation.ok ? evaluation.policy.currency : "EUR", taxIncluded: false, taxRate: "0", packQuantity: "1", packUnit: "kg" };
  const [price, setPrice] = useState<DemoPrice>(ingredient.price ?? blank);
  const [yieldRate, setYieldRate] = useState(ingredient.yieldRate);
  const draft = useMemo(() => ({ ...ingredient, price, yieldRate }), [ingredient, price, yieldRate]);
  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...ingredient, price: ingredient.price ?? blank });

  const impact = useMemo(() => {
    if (!evaluation.ok) return [];
    const next = evaluate(ws, ws.ingredients.map((i) => (i.id === ingredient.id ? draft : i)));
    if (!next.ok) return [];
    const affected = new Set(recipesUsing(ws, ingredient.id).map((r) => r.id));
    return evaluation.dishes
      .filter((d) => affected.has(d.recipe.id))
      .map((d) => ({ now: d, next: next.dishes.find((x) => x.recipe.id === d.recipe.id)! }));
  }, [ws, evaluation, ingredient.id, draft]);
  const cur = evaluation.ok ? evaluation.policy.currency : "EUR";
  const units = ws.units.map((u) => u.code);

  return (
    <Panel eyebrow="Edit ingredient · demo only" title={ingredient.name}
      actions={<Button size="sm" variant="ghost" onClick={() => dispatch({ type: "go", screen: "ingredients", ingredientId: null })} aria-label="Close editor">✕</Button>}>
      <div className="grid grid-cols-2 gap-3 text-xs text-muted">
        <label htmlFor="ed-amount">Price
          <DecimalField id="ed-amount" label="Purchase price" value={price.amount} prefix={price.currency} className="mt-1" onCommit={(v) => setPrice({ ...price, amount: v })} />
        </label>
        <label htmlFor="ed-pack">Per pack of
          <span className="mt-1 flex gap-1">
            <DecimalField id="ed-pack" label="Pack quantity" value={price.packQuantity} allowZero={false} className="flex-1" onCommit={(v) => setPrice({ ...price, packQuantity: v })} />
            <SelectInput id="ed-unit" aria-label="Pack unit" value={price.packUnit} onChange={(e) => setPrice({ ...price, packUnit: e.target.value })} className="w-20">
              {units.map((u) => <option key={u}>{u}</option>)}
            </SelectInput>
          </span>
        </label>
        <label htmlFor="ed-tax">Purchase tax rate
          <DecimalField id="ed-tax" label="Purchase tax rate" percent value={price.taxRate} max="99" suffix="%" className="mt-1" onCommit={(v) => setPrice({ ...price, taxRate: v })} />
        </label>
        <label className="flex items-center gap-2 pt-5 text-sm text-ink" htmlFor="ed-incl">
          <input id="ed-incl" type="checkbox" checked={price.taxIncluded} onChange={(e) => setPrice({ ...price, taxIncluded: e.target.checked })} />
          Price includes tax
        </label>
        <label htmlFor="ed-yield">Usable yield
          <DecimalField id="ed-yield" label="Usable yield percent" percent value={yieldRate} allowZero={false} max="100" suffix="%" className="mt-1" onCommit={setYieldRate} />
        </label>
        <div>Supplier<p className="mt-1 py-1.5 text-sm text-ink">{ingredient.supplier ?? "—"} <span className="num text-muted">{ingredient.supplierCode}</span></p></div>
      </div>

      {ingredient.conversions.length > 0 && (
        <p className="mt-3 text-xs text-muted">Unit conversion: {ingredient.conversions.map((c) => `1 ${c.fromUnit} = ${qty(c.factor)} ${c.toUnit}`).join(", ")} (used only for this ingredient)</p>
      )}

      <div className="mt-4">
        <p className="eyebrow mb-2">Effect on menu dishes</p>
        {impact.length === 0 && <p className="text-sm text-muted">Not used in any menu dish.</p>}
        <ul className="space-y-2 text-sm">
          {impact.map(({ now, next }) => {
            const a = now.pricing?.actual?.foodCostRate;
            const b = next.pricing?.actual?.foodCostRate;
            const d = Number(next.cost.costPerPortion) - Number(now.cost.costPerPortion);
            return (
              <li key={now.recipe.id} className="rounded-lg border border-line px-3 py-2">
                <p className="font-medium">{now.recipe.name}</p>
                <p className="num mt-0.5 flex flex-wrap justify-between gap-2 text-xs text-muted">
                  <span>{money(now.cost.costPerPortion, cur, ws.locale)} → <span className="text-ink">{money(next.cost.costPerPortion, cur, ws.locale)}</span> {Math.abs(d) > 0.0005 && <span className={d > 0 ? "text-danger" : "text-ok"}>({d > 0 ? "+" : ""}{money(d, cur, ws.locale, 3)})</span>}</span>
                  <span>FC {pct(a)} → <span className={next.state === "above_target" ? "text-danger" : "text-ink"}>{pct(b)}</span></span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={!dirty} onClick={() => dispatch({ type: "ingredient", id: ingredient.id, patch: { price, yieldRate } })}>Apply change (demo)</Button>
        <Button variant="secondary" disabled={!dirty} onClick={() => { setPrice(ingredient.price ?? blank); setYieldRate(ingredient.yieldRate); }}>Discard</Button>
      </div>
      <p className="mt-2 text-xs text-muted">In the product, a price change becomes a pending price with history and approval. Here it only updates this preview.</p>
    </Panel>
  );
}
