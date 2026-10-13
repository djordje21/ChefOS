"use client";

import { useMemo, useState } from "react";
import { Decimal } from "@/lib/costing/decimal";
import type { LineResult, RecipeCostResult } from "@/lib/costing";
import type { DemoLine, DemoRecipe } from "../data";
import { money, pct, qty } from "../format";
import type { DishView } from "../model";
import { useDemo } from "../store";
import { Button, Chip, DecimalField, Dot, Panel, SelectInput, StatusTag, TextInput, cx } from "../ui";

const ISSUE_LABEL: Record<string, string> = {
  MISSING_PRICE: "No price",
  MISSING_CONVERSION: "No unit conversion",
  MISSING_EXCHANGE_RATE: "No exchange rate",
  MISSING_INGREDIENT: "Unknown ingredient",
  MISSING_RECIPE: "Unknown sub-recipe",
  MISSING_YIELD: "Sub-recipe has no batch yield",
  RECIPE_CYCLE: "Recipe cycle",
  SUB_RECIPE_INCOMPLETE: "Sub-recipe incomplete",
  NO_LINES: "No lines",
  ZERO_QUANTITY: "Quantity is 0",
  ZERO_PRICE: "Price is 0",
};

const SHARE_COLORS = ["var(--accent)", "var(--info)", "var(--ok)", "var(--warn)", "var(--muted)"];

export function dishTone(state: DishView["state"]) {
  return state === "on_target" ? "ok" : state === "above_target" ? "bad" : "warn";
}
export function dishStateLabel(state: DishView["state"]) {
  return { on_target: "On target", above_target: "Above target", incomplete: "Incomplete", no_target: "No target set" }[state];
}

export function RecipeCosting() {
  const { state, ws, evaluation, dispatch } = useDemo();
  const [filter, setFilter] = useState<"dish" | "sub_recipe">("dish");
  const [search, setSearch] = useState("");

  if (!evaluation.ok) {
    return <Panel title="Calculation stopped"><p className="text-sm text-danger">{evaluation.error}</p></Panel>;
  }
  const outletOk = (r: DemoRecipe) => state.outletId === "all" || r.outletId === state.outletId || r.outletId === null;
  const list = ws.recipes
    .filter((r) => r.kind === filter && outletOk(r))
    .filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()));
  const recipe =
    ws.recipes.find((r) => r.id === state.recipeId && outletOk(r)) ??
    ws.recipes.find((r) => r.kind === "dish" && outletOk(r)) ??
    ws.recipes[0]!;
  const cost = evaluation.recipeCosts.get(recipe.id)!;
  const dishView = evaluation.dishes.find((d) => d.recipe.id === recipe.id) ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[240px_minmax(0,1fr)_330px]">
      {/* Compact recipe picker below 2xl */}
      <div className="flex flex-wrap items-center gap-2 xl:col-span-2 2xl:hidden">
        <label className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="recipe-picker">
          Recipe
          <SelectInput id="recipe-picker" className="mt-1 text-sm font-medium normal-case tracking-normal" value={recipe.id}
            onChange={(e) => dispatch({ type: "go", screen: "recipes", recipeId: e.target.value })}>
            {(["dish", "sub_recipe"] as const).map((k) => (
              <optgroup key={k} label={k === "dish" ? "Menu dishes" : "Sub-recipes (shared)"}>
                {ws.recipes.filter((r) => r.kind === k && outletOk(r)).map((r) => {
                  const dv = evaluation.dishes.find((d) => d.recipe.id === r.id);
                  return <option key={r.id} value={r.id}>{r.name}{dv ? ` — ${dishStateLabel(dv.state)}` : ""}</option>;
                })}
              </optgroup>
            ))}
          </SelectInput>
        </label>
      </div>
      {/* Recipe list (wide screens) */}
      <aside className="hidden min-w-0 space-y-3 2xl:block">
        <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-sm" role="tablist" aria-label="Recipe type">
          {(["dish", "sub_recipe"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={cx("flex-1 rounded-md px-2 py-1.5 font-semibold transition", filter === k ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink")}
            >
              {k === "dish" ? "Menu dishes" : "Sub-recipes"}
            </button>
          ))}
        </div>
        <TextInput id="recipe-search" placeholder="Search recipes" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search recipes" />
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto lg:max-h-none">
          {list.length === 0 && <li className="px-2 py-3 text-sm text-muted">No recipes match.</li>}
          {list.map((r) => {
            const dv = evaluation.dishes.find((d) => d.recipe.id === r.id);
            const rc = evaluation.recipeCosts.get(r.id)!;
            const active = r.id === recipe.id;
            return (
              <li key={r.id}>
                <button
                  onClick={() => dispatch({ type: "go", screen: "recipes", recipeId: r.id })}
                  className={cx(
                    "w-full rounded-lg border px-3 py-2 text-left transition",
                    active ? "border-accent/40 bg-accent-soft" : "border-transparent hover:border-line hover:bg-surface",
                  )}
                >
                  <span className="flex items-start gap-2">
                    <span className="mt-1.5"><Dot tone={dv ? dishTone(dv.state) : rc.status === "incomplete" ? "warn" : "ok"} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">{r.name}</span>
                      <span className="mt-0.5 flex justify-between gap-2 text-xs text-muted">
                        <span className="truncate">{r.outletId ? ws.outlets.find((o) => o.id === r.outletId)?.name : "Shared library"}</span>
                        <span className="num shrink-0">{dv?.pricing?.actual ? pct(dv.pricing.actual.foodCostRate) : money(rc.costPerPortion, cost.currency, ws.locale)}</span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <RecipeSheet recipe={recipe} cost={cost} dishView={dishView} />
      <Summary recipe={recipe} cost={cost} dishView={dishView} />
    </div>
  );
}

function RecipeSheet({ recipe, cost, dishView }: { recipe: DemoRecipe; cost: RecipeCostResult; dishView: DishView | null }) {
  const { ws, dispatch } = useDemo();
  const [scaleTo, setScaleTo] = useState<string>(recipe.portions);
  const [scaleFor, setScaleFor] = useState(recipe.id);
  if (scaleFor !== recipe.id) {
    setScaleFor(recipe.id);
    setScaleTo(recipe.portions);
  }
  const factor = new Decimal(scaleTo).dividedBy(recipe.portions);
  const scaled = !factor.equals(1);
  const outlet = ws.outlets.find((o) => o.id === recipe.outletId);
  const cur = cost.currency;
  const total = new Decimal(cost.ingredientCost);

  return (
    <section className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">
            {recipe.kind === "dish" ? `${outlet?.name ?? "—"} · ${dishView?.dish.category ?? ""}` : "Shared sub-recipe · usable by every outlet"}
          </p>
          <h1 className="display mt-1 text-2xl sm:text-[1.7rem]">{recipe.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip>v{recipe.version}</Chip>
            <Chip tone={recipe.approval === "approved" ? "ok" : "warn"}>{recipe.approval === "approved" ? "Approved" : "Draft — changes pending approval"}</Chip>
            <Chip tone={cost.status === "complete" ? "ok" : cost.status === "incomplete" ? "bad" : "warn"}>
              {cost.status === "complete" ? "Fully costed" : cost.status === "incomplete" ? "Incomplete costing" : "Costed with warnings"}
            </Chip>
            {recipe.allergens.map((a) => <Chip key={a} tone="info">{a}</Chip>)}
            {recipe.allergens.length === 0 && <Chip>No allergens declared</Chip>}
          </div>
        </div>
        <StatusTag kind="engine" />
      </header>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
        <label className="text-xs text-muted" htmlFor="portions">
          Recipe makes (portions)
          <DecimalField id="portions" label="Portions" value={recipe.portions} allowZero={false} className="mt-1 w-28"
            onCommit={(v) => dispatch({ type: "portions", recipeId: recipe.id, portions: v })} />
        </label>
        {recipe.yield && (
          <div className="text-xs text-muted">
            Batch yield
            <p className="num mt-1 py-1.5 text-sm text-ink">{qty(recipe.yield.quantity)} {recipe.yield.unit}</p>
          </div>
        )}
        <label className="text-xs text-muted" htmlFor="scale">
          Show quantities for
          <DecimalField id="scale" label="Scale to portions" value={scaleTo} allowZero={false} suffix="portions" className="mt-1 w-40"
            onCommit={setScaleTo} />
        </label>
        {scaled && (
          <div className="flex items-center gap-2 pb-1.5 text-xs">
            <Chip tone="info">Scaled ×{qty(factor.toString(), 3)}</Chip>
            <Button size="sm" variant="ghost" onClick={() => setScaleTo(recipe.portions)}>Back to recipe</Button>
          </div>
        )}
      </div>

      {/* Phones: one card per line */}
      <ul className="space-y-2 md:hidden">
        {recipe.lines.map((line, i) => (
          <LineRow key={`m-${recipe.id}-${i}`} variant="card" recipe={recipe} line={line} result={cost.lines[i]!} index={i} factor={factor} total={total} />
        ))}
        <li className="rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-card">
          <dl className="grid grid-cols-[1fr_auto] gap-y-1">
            <dt className="text-muted">Ingredient cost</dt><dd className="num text-right">{money(total.times(factor).toString(), cur, ws.locale)}</dd>
            <dt className="text-muted">Allowance {cost.allowance.rate ? pct(cost.allowance.rate) : "(none)"}</dt><dd className="num text-right">{money(new Decimal(cost.allowance.amount).times(factor).toString(), cur, ws.locale)}</dd>
            <dt className="font-semibold">Total for {qty(scaled ? scaleTo : recipe.portions)} portion(s)</dt><dd className="num text-right font-semibold">{money(new Decimal(cost.totalCost).times(factor).toString(), cur, ws.locale)}</dd>
          </dl>
        </li>
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface shadow-card md:block">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] uppercase tracking-wider text-muted">
              <th className="px-3 py-2.5 font-semibold">Item</th>
              <th className="px-2 py-2.5 text-right font-semibold">Quantity</th>
              <th className="px-2 py-2.5 font-semibold">Unit</th>
              <th className="px-2 py-2.5 font-semibold" title="Net = usable quantity in the dish; gross = as purchased, before trim">Basis</th>
              <th className="px-2 py-2.5 text-right font-semibold" title="Usable yield, and the quantity taken from stock (as purchased)">Yield · purchased</th>
              <th className="px-2 py-2.5 text-right font-semibold">Line cost</th>
              <th className="w-28 px-3 py-2.5 font-semibold">Share</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {recipe.lines.map((line, i) => (
              <LineRow key={`${recipe.id}-${i}`} variant="row" recipe={recipe} line={line} result={cost.lines[i]!} index={i} factor={factor} total={total} />
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr className="border-t border-line">
              <td colSpan={5} className="px-3 py-2 text-muted">Ingredient cost {scaled ? `(${qty(scaleTo)} portions)` : "(recipe)"}</td>
              <td className="num px-2 py-2 text-right">{money(total.times(factor).toString(), cur, ws.locale)}</td>
              <td colSpan={2} />
            </tr>
            <tr>
              <td colSpan={5} className="px-3 py-2 text-muted">
                Minor-ingredient allowance {cost.allowance.rate ? `(${pct(cost.allowance.rate)} of ingredient cost)` : "(not applied)"}
              </td>
              <td className="num px-2 py-2 text-right">{money(new Decimal(cost.allowance.amount).times(factor).toString(), cur, ws.locale)}</td>
              <td colSpan={2} />
            </tr>
            <tr className="border-t border-line font-semibold">
              <td colSpan={5} className="px-3 py-2.5">Total cost {scaled ? `for ${qty(scaleTo)} portions` : `for ${qty(recipe.portions)} portion${recipe.portions === "1" ? "" : "s"}`}</td>
              <td className="num px-2 py-2.5 text-right">{money(new Decimal(cost.totalCost).times(factor).toString(), cur, ws.locale)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <AddLine recipe={recipe} />
      <p className="text-xs text-muted">Method: {recipe.method}</p>
    </section>
  );
}

function LineRow({ variant, recipe, line, result, index, factor, total }: { variant: "row" | "card"; recipe: DemoRecipe; line: DemoLine; result: LineResult; index: number; factor: Decimal; total: Decimal }) {
  const { ws, dispatch, evaluation } = useDemo();
  const isIng = line.kind === "ingredient";
  const ingredient = isIng ? ws.ingredients.find((x) => x.id === line.ingredientId) : null;
  const sub = !isIng ? ws.recipes.find((r) => r.id === line.recipeId) : null;
  const name = ingredient?.name ?? sub?.name ?? result.ref;
  const unitOptions = isIng
    ? unitsFor(ws, ingredient?.conversions ?? [], line.unit)
    : sub?.yield
      ? [...unitsFor(ws, [], sub.yield.unit).filter((u) => sameDimension(ws, u, sub.yield!.unit)), "portion"]
      : ["portion"];
  const errors = result.issues.filter((x) => x.severity === "error");
  const warnings = result.issues.filter((x) => x.severity === "warning");
  const share = result.cost && !total.isZero() ? new Decimal(result.cost).dividedBy(total) : null;
  const scaledQty = new Decimal(line.quantity).times(factor).toString();
  const cur = evaluation.ok ? evaluation.policy.currency : "EUR";
  const idp = variant === "card" ? "m-" : "";
  const editable = factor.equals(1);

  const qtyField = editable ? (
    <DecimalField id={`${idp}q-${recipe.id}-${index}`} label={`Quantity of ${name}`} value={line.quantity} className={variant === "card" ? "w-24" : "ml-auto w-24"}
      onCommit={(v) => dispatch({ type: "line", recipeId: recipe.id, index, patch: { quantity: v } })} />
  ) : (
    <p className="num py-1.5 text-right">{qty(scaledQty)}</p>
  );
  const unitField = (
    <SelectInput id={`${idp}u-${recipe.id}-${index}`} aria-label={`Unit of ${name}`} value={line.unit} disabled={!editable} className="w-[5.25rem] min-w-[5.25rem] pr-6"
      onChange={(e) => dispatch({ type: "line", recipeId: recipe.id, index, patch: { unit: e.target.value } })}>
      {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
    </SelectInput>
  );
  const basisField = isIng ? (
    <SelectInput id={`${idp}b-${recipe.id}-${index}`} aria-label={`Quantity basis of ${name}`} value={result.basis ?? "net"} disabled={!editable} className="w-[5.25rem] min-w-[5.25rem] pr-6"
      onChange={(e) => dispatch({ type: "line", recipeId: recipe.id, index, patch: { basis: e.target.value as "net" | "gross" } })}>
      <option value="net">Net</option>
      <option value="gross">Gross</option>
    </SelectInput>
  ) : null;
  const issueChips = (errors.length > 0 || warnings.length > 0) && (
    <div className="mt-1 flex flex-wrap gap-1">
      {[...errors, ...warnings].map((x, k) => (
        <Chip key={k} tone={x.severity === "error" ? "bad" : "warn"} title={x.message}>{ISSUE_LABEL[x.code] ?? x.code}</Chip>
      ))}
    </div>
  );
  const costText = result.cost === null ? <span className="text-danger">n/a</span> : money(new Decimal(result.cost).times(factor).toString(), cur, ws.locale, 3);

  if (variant === "card") {
    return (
      <li className={cx("rounded-xl border border-line bg-surface px-3 py-3 shadow-card", errors.length > 0 && "border-danger/40")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {!isIng && <Chip tone="accent">Sub-recipe</Chip>}
            <p className="font-medium">{name}</p>
            {ingredient?.supplier && <p className="text-xs text-muted">{ingredient.supplier}</p>}
            {issueChips}
          </div>
          <p className="num shrink-0 text-right font-medium">{costText}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {qtyField}{unitField}{basisField}
          <Button size="sm" variant="ghost" aria-label={`Remove ${name}`} disabled={!editable} onClick={() => dispatch({ type: "removeLine", recipeId: recipe.id, index })}>Remove</Button>
        </div>
        {result.yieldRate && (
          <p className="num mt-1.5 text-xs text-muted">Yield {pct(result.yieldRate, 0)} · purchased {qty(new Decimal(result.grossQuantity!).times(factor).toString(), 1)} {line.unit}{share ? ` · ${pct(share.toString(), 0)} of cost` : ""}</p>
        )}
      </li>
    );
  }

  return (
    <tr className={cx("border-b border-line/70 align-top last:border-0", errors.length > 0 && "bg-danger-soft/50")}>
      <td className="px-3 py-2.5">
        <div className="flex flex-col items-start gap-1">
          {!isIng && <Chip tone="accent">Sub-recipe</Chip>}
          {!isIng && sub ? (
            <button className="text-left font-medium underline decoration-line-strong underline-offset-2 hover:text-accent" onClick={() => dispatch({ type: "go", screen: "recipes", recipeId: sub.id })}>{name}</button>
          ) : (
            <span className="font-medium">{name}</span>
          )}
        </div>
        {issueChips}
        {ingredient?.supplier && <p className="mt-0.5 text-xs text-muted">{ingredient.supplier}</p>}
      </td>
      <td className="px-2 py-2">{qtyField}</td>
      <td className="px-2 py-2">{unitField}</td>
      <td className="px-2 py-2">{basisField ?? <span className="text-xs text-muted">—</span>}</td>
      <td className="num whitespace-nowrap px-2 py-2.5 text-right text-muted">
        {result.yieldRate ? (
          <>
            <span className="block">{pct(result.yieldRate, 0)}</span>
            <span className="block text-xs">{qty(new Decimal(result.grossQuantity!).times(factor).toString(), 1)} {line.unit}</span>
          </>
        ) : "—"}
      </td>
      <td className="num whitespace-nowrap px-2 py-2.5 text-right font-medium">
        {costText}
      </td>
      <td className="px-3 py-2.5">
        {share && (
          <span className="flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Number(share) * 100)}%` }} />
            </span>
            <span className="num w-10 text-right text-xs text-muted">{pct(share.toString(), 0)}</span>
          </span>
        )}
      </td>
      <td className="pr-2 py-2">
        <Button size="sm" variant="ghost" aria-label={`Remove ${name}`} disabled={!editable} onClick={() => dispatch({ type: "removeLine", recipeId: recipe.id, index })}>✕</Button>
      </td>
    </tr>
  );
}

function sameDimension(ws: ReturnType<typeof useDemo>["ws"], a: string, b: string) {
  const ua = ws.units.find((u) => u.code === a);
  const ub = ws.units.find((u) => u.code === b);
  return !!ua && !!ub && ua.dimension === ub.dimension;
}

/** Units that can be converted for this item: same dimension, plus dimensions reachable through explicit conversions. */
function unitsFor(ws: ReturnType<typeof useDemo>["ws"], conversions: { fromUnit: string; toUnit: string }[], current: string) {
  const dims = new Set<string>();
  const add = (code: string) => {
    const u = ws.units.find((x) => x.code === code);
    if (u) dims.add(u.dimension);
  };
  add(current);
  conversions.forEach((c) => { add(c.fromUnit); add(c.toUnit); });
  return ws.units.filter((u) => dims.has(u.dimension)).map((u) => u.code);
}

function AddLine({ recipe }: { recipe: DemoRecipe }) {
  const { ws, dispatch } = useDemo();
  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState("0");
  const options = useMemo(() => {
    const ings = ws.ingredients.filter((i) => i.status === "active").map((i) => ({ value: `i:${i.id}`, label: i.name, group: i.category }));
    const subs = ws.recipes.filter((r) => r.kind === "sub_recipe" && r.id !== recipe.id).map((r) => ({ value: `r:${r.id}`, label: r.name, group: "Sub-recipes" }));
    return [...subs, ...ings];
  }, [ws, recipe.id]);
  const groups = [...new Set(options.map((o) => o.group))];

  const add = () => {
    if (!item) return;
    const [kind, id] = item.split(":") as ["i" | "r", string];
    if (kind === "i") {
      const ing = ws.ingredients.find((x) => x.id === id)!;
      const unit = ing.price?.packUnit === "kg" ? "g" : ing.price?.packUnit === "l" ? "ml" : (ing.price?.packUnit ?? "g");
      dispatch({ type: "addLine", recipeId: recipe.id, line: { kind: "ingredient", ingredientId: id, quantity, unit } });
    } else {
      const sub = ws.recipes.find((x) => x.id === id)!;
      const unit = sub.yield ? (sub.yield.unit === "kg" ? "g" : sub.yield.unit === "l" ? "ml" : sub.yield.unit) : "portion";
      dispatch({ type: "addLine", recipeId: recipe.id, line: { kind: "recipe", recipeId: id, quantity, unit } });
    }
    setItem("");
    setQuantity("0");
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line-strong px-3 py-3">
      <label className="min-w-[14rem] flex-1 text-xs text-muted" htmlFor="add-item">
        Add ingredient or sub-recipe
        <SelectInput id="add-item" value={item} onChange={(e) => setItem(e.target.value)} className="mt-1">
          <option value="">Choose…</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
        </SelectInput>
      </label>
      <label className="text-xs text-muted" htmlFor="add-qty">
        Quantity
        <DecimalField id="add-qty" label="Quantity to add" value={quantity} onCommit={setQuantity} className="mt-1 w-24" />
      </label>
      <Button onClick={add} disabled={!item}>Add line</Button>
    </div>
  );
}

function Summary({ recipe, cost, dishView }: { recipe: DemoRecipe; cost: RecipeCostResult; dishView: DishView | null }) {
  const { ws, evaluation, dispatch } = useDemo();
  if (!evaluation.ok) return null;
  const policy = evaluation.policy;
  const cur = cost.currency;
  const top = cost.lines
    .filter((l) => l.cost && Number(l.cost) > 0)
    .sort((a, b) => Number(b.cost) - Number(a.cost));
  const totalIng = Number(cost.ingredientCost) || 1;
  const shown = top.slice(0, 4);
  const rest = top.slice(4).reduce((s, l) => s + Number(l.cost), 0);
  const nameOf = (l: LineResult) =>
    (l.kind === "ingredient" ? ws.ingredients.find((i) => i.id === l.ref)?.name : ws.recipes.find((r) => r.id === l.ref)?.name) ?? l.ref;

  return (
    <aside className="min-w-0 space-y-4 lg:col-start-2 xl:col-start-auto">
      <Panel eyebrow={recipe.kind === "dish" ? "Cost per portion" : "Cost"} title={
        <span className="num text-[1.9rem] font-medium leading-none">{money(cost.costPerPortion, cur, ws.locale)}</span>
      }>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted">Recipe total</dt><dd className="num text-right">{money(cost.totalCost, cur, ws.locale)}</dd>
          <dt className="text-muted">Portions</dt><dd className="num text-right">{qty(recipe.portions)}</dd>
          {cost.costPerYieldUnit && recipe.yield && (<><dt className="text-muted">Per {recipe.yield.unit} of yield</dt><dd className="num text-right">{money(cost.costPerYieldUnit, cur, ws.locale)}</dd></>)}
        </dl>
        {top.length > 0 && (
          <div className="mt-4">
            <p className="eyebrow mb-2">Where the cost goes</p>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              {shown.map((l, i) => <span key={l.line} style={{ width: `${(Number(l.cost) / totalIng) * 100}%`, background: SHARE_COLORS[i] }} />)}
              {rest > 0 && <span style={{ width: `${(rest / totalIng) * 100}%`, background: SHARE_COLORS[4], opacity: 0.4 }} />}
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {shown.map((l, i) => (
                <li key={l.line} className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: SHARE_COLORS[i] }} />
                  <span className="min-w-0 flex-1 truncate">{nameOf(l)}</span>
                  <span className="num text-muted">{pct(Number(l.cost) / totalIng, 0)}</span>
                </li>
              ))}
              {rest > 0 && <li className="flex items-center gap-2 text-muted"><span className="h-2 w-2 rounded-sm opacity-40" style={{ background: SHARE_COLORS[4] }} /><span className="flex-1">Other lines</span><span className="num">{pct(rest / totalIng, 0)}</span></li>}
            </ul>
          </div>
        )}
      </Panel>

      {dishView && <PricingPanel dishView={dishView} />}

      {cost.issues.length > 0 && (
        <Panel eyebrow="Needs attention" title={`${cost.issues.length} issue${cost.issues.length > 1 ? "s" : ""}`}>
          <ul className="space-y-2 text-sm">
            {cost.issues.map((x, i) => (
              <li key={i} className="flex gap-2">
                <Dot tone={x.severity === "error" ? "bad" : "warn"} />
                <span className="-mt-1">Line {x.line}: {x.message}{x.code === "MISSING_PRICE" && (
                  <> · <button className="font-semibold text-accent hover:underline" onClick={() => dispatch({ type: "go", screen: "ingredients", ingredientId: x.ref })}>Add price</button></>
                )}</span>
              </li>
            ))}
          </ul>
          {cost.status === "incomplete" && <p className="mt-3 text-xs text-muted">Totals include only the lines that could be costed.</p>}
        </Panel>
      )}

      <div className="rounded-xl border border-line px-4 py-3 text-xs text-muted">
        <p>
          Costing rules <span className="font-semibold text-ink">v{policy.version}</span> (from {policy.validFrom}) · {policy.defaultQuantityBasis} quantities by default ·
          {policy.allowance.mode === "none" ? " no allowance" : ` allowance ${pct(policy.allowance.rate as string)}`} ·
          {policy.rounding.mode === "none" ? " no price rounding" : ` prices rounded ${policy.rounding.mode.replace("_", "-")} to ${money(policy.rounding.step as string, cur, ws.locale)}`}
        </p>
        <button className="mt-1 font-semibold text-accent hover:underline" onClick={() => dispatch({ type: "go", screen: "settings" })}>Change costing rules</button>
        <p className="mt-2">Calculated by the ChefOS costing engine {cost.engineVersion}.</p>
      </div>
    </aside>
  );
}

function PricingPanel({ dishView }: { dishView: DishView }) {
  const { ws, evaluation, dispatch } = useDemo();
  if (!evaluation.ok) return null;
  const policy = evaluation.policy;
  const cur = policy.currency;
  const inclusive = policy.menuPriceEntry === "tax_inclusive";
  const p = dishView.pricing;
  const actual = p?.actual;
  const rate = actual ? Number(actual.foodCostRate) : null;
  const target = dishView.target ? Number(dishView.target) : null;
  const scaleMax = Math.max(0.5, (rate ?? 0) * 1.15, (target ?? 0) * 1.3);

  return (
    <Panel eyebrow="Menu price" title={dishView.dish.category} actions={<Chip tone={dishTone(dishView.state)}>{dishStateLabel(dishView.state)}</Chip>}>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted" htmlFor="menu-price">
          Menu price ({inclusive ? "incl." : "excl."} tax)
          <DecimalField id="menu-price" label="Menu price" value={dishView.dish.menuPrice} allowZero={false} prefix={cur} className="mt-1"
            onCommit={(v) => dispatch({ type: "dish", recipeId: dishView.recipe.id, patch: { menuPrice: v } })} />
        </label>
        <label className="text-xs text-muted" htmlFor="target">
          Target food cost
          <DecimalField id="target" label="Target food cost percent" percent value={dishView.target ?? "0"} max="99" suffix="%" className="mt-1"
            onCommit={(v) => dispatch({ type: "dish", recipeId: dishView.recipe.id, patch: { targetOverride: v } })} />
          <span className="mt-1 block">
            {dishView.targetSource === "dish" ? (
              <button className="font-semibold text-accent hover:underline" onClick={() => dispatch({ type: "dish", recipeId: dishView.recipe.id, patch: { targetOverride: null } })}>Use category target</button>
            ) : dishView.targetSource === "category" ? `From ${dishView.dish.category}` : "No target set"}
          </span>
        </label>
      </div>

      {actual && rate !== null && target !== null && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Food cost</span>
            <span className={cx("num text-xl font-medium", rate > target ? "text-danger" : "text-ok")}>{pct(actual.foodCostRate)}</span>
          </div>
          <div className="relative mt-2 h-2 rounded-full bg-surface-2" role="img" aria-label={`Food cost ${pct(actual.foodCostRate)} against target ${pct(target)}`}>
            <span className={cx("absolute inset-y-0 left-0 rounded-full", rate > target ? "bg-danger" : "bg-ok")} style={{ width: `${Math.min(100, (rate / scaleMax) * 100)}%` }} />
            <span className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${(target / scaleMax) * 100}%` }} title={`Target ${pct(target)}`} />
          </div>
          <div className="mt-1 flex justify-between text-[0.7rem] text-muted"><span>0 %</span><span>target {pct(target)}</span><span>{pct(scaleMax, 0)}</span></div>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted">Net price (excl. {pct(ws.menuTaxRate.rate, 0)} tax)</dt><dd className="num text-right">{money(actual.netPrice, cur, ws.locale)}</dd>
            <dt className="text-muted">Price incl. tax</dt><dd className="num text-right">{money(actual.grossPrice, cur, ws.locale)}</dd>
            <dt className="text-muted" title="Net price minus ingredient cost. Before labour, overheads, payment fees and other operating costs; not profit.">Contribution*</dt>
            <dd className="num text-right font-semibold">{money(actual.contribution, cur, ws.locale)}</dd>
          </dl>
          <p className="mt-1 text-[0.7rem] text-muted">* Before labour, overheads and fees. Not profit.</p>
        </div>
      )}

      {p && (
        <div className="mt-4 rounded-lg bg-surface-2 px-3 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm">Suggested price</span>
            <span className="num text-lg font-medium">{money(p.suggested.menuPrice, cur, ws.locale)}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Hits {pct(dishView.target)} ({pct(p.suggested.foodCostRate)} after rounding{policy.rounding.mode !== "none" ? ` ${policy.rounding.mode.replace("_", "-")} to ${money(policy.rounding.step as string, cur, ws.locale)}` : ""}).
          </p>
          {p.suggested.menuPrice !== actual?.menuPrice && (
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => dispatch({ type: "dish", recipeId: dishView.recipe.id, patch: { menuPrice: p.suggested.menuPrice } })}>
              Use suggested price
            </Button>
          )}
        </div>
      )}
      {dishView.state === "incomplete" && <p className="mt-3 text-xs text-warn">Food cost is understated until every line has a price.</p>}
    </Panel>
  );
}
