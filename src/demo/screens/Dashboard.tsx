"use client";

import { useMemo } from "react";
import { money, pct } from "../format";
import { evaluate, recipesUsing } from "../model";
import { useDemo } from "../store";
import { Button, Chip, Dot, Panel, Stat, StatusTag } from "../ui";
import { dishStateLabel, dishTone } from "./RecipeCosting";

export function Dashboard() {
  const { state, ws, evaluation, dispatch } = useDemo();

  const priceChanges = useMemo(() => {
    if (!evaluation.ok) return [];
    return ws.ingredients
      .filter((i) => i.previousPrice && i.price)
      .map((i) => {
        const change = Number(i.price!.amount) / Number(i.previousPrice!.amount) - 1;
        // Recalculate every dish with the previous price to show the real impact.
        const before = evaluate(ws, ws.ingredients.map((x) => (x.id === i.id ? { ...x, price: { ...x.price!, amount: i.previousPrice!.amount } } : x)));
        const affected = recipesUsing(ws, i.id).filter((r) => r.kind === "dish");
        const impacts = before.ok
          ? affected.map((r) => {
              const now = evaluation.dishes.find((d) => d.recipe.id === r.id);
              const was = before.dishes.find((d) => d.recipe.id === r.id);
              return { name: r.name, delta: Number(now?.cost.costPerPortion ?? 0) - Number(was?.cost.costPerPortion ?? 0) };
            })
          : [];
        return { ingredient: i, change, impacts };
      })
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [ws, evaluation]);

  if (!evaluation.ok) return <Panel title="Calculation stopped"><p className="text-sm text-danger">{evaluation.error}</p></Panel>;

  const cur = evaluation.policy.currency;
  const dishes = evaluation.dishes.filter((d) => state.outletId === "all" || d.recipe.outletId === state.outletId);
  const costed = dishes.filter((d) => d.cost.status !== "incomplete");
  const above = dishes.filter((d) => d.state === "above_target");
  const usedIngredientIds = new Set(ws.recipes.flatMap((r) => r.lines.flatMap((l) => (l.kind === "ingredient" ? [l.ingredientId] : []))));
  const missingPrices = ws.ingredients.filter((i) => i.status === "active" && !i.price);
  const missingUsed = missingPrices.filter((i) => usedIngredientIds.has(i.id));
  const rated = costed.filter((d) => d.pricing?.actual);
  const avg = rated.length ? rated.reduce((s, d) => s + Number(d.pricing!.actual!.foodCostRate), 0) / rated.length : null;
  const attention = dishes.filter((d) => d.state !== "on_target");
  const outletName = state.outletId === "all" ? "All outlets" : ws.outlets.find((o) => o.id === state.outletId)?.name;
  const maxRate = Math.max(0.5, ...dishes.map((d) => Number(d.pricing?.actual?.foodCostRate ?? 0) * 1.1));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{outletName}</p>
          <h1 className="display mt-1 text-2xl sm:text-[1.7rem]">Kitchen cost overview</h1>
        </div>
        <StatusTag kind="engine" />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Dishes fully costed" value={`${costed.length} / ${dishes.length}`} tone={costed.length === dishes.length ? "ok" : "warn"} sub="Every line priced and convertible" />
        <Stat label="Above target" value={above.length} tone={above.length ? "bad" : "ok"} sub="Food cost higher than the dish or category target" />
        <Stat label="Missing prices" value={missingPrices.length} tone={missingUsed.length ? "bad" : missingPrices.length ? "warn" : "ok"} sub={`${missingUsed.length} used in recipes`} />
        <Stat label="Average food cost" value={avg === null ? "—" : pct(avg)} sub={`Simple average of ${rated.length} fully costed dishes; not sales-weighted`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Panel eyebrow="Food cost by dish" title="Actual against target" actions={<span className="text-xs text-muted">bar = actual · tick = target</span>}>
          <ul className="space-y-3">
            {dishes.map((d) => {
              const rate = Number(d.pricing?.actual?.foodCostRate ?? 0);
              const target = d.target ? Number(d.target) : null;
              const tone = dishTone(d.state);
              return (
                <li key={d.recipe.id}>
                  <button className="block w-full text-left" onClick={() => dispatch({ type: "go", screen: "recipes", recipeId: d.recipe.id })}>
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium hover:text-accent">{d.recipe.name}</span>
                      <span className="num shrink-0">{d.pricing?.actual ? pct(rate) : "—"}{d.state === "incomplete" && <span className="text-warn"> *</span>}</span>
                    </span>
                    <span className="relative mt-1.5 block h-2 rounded-full bg-surface-2">
                      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(rate / maxRate) * 100}%`, background: `var(--${tone === "bad" ? "bad" : tone === "ok" ? "ok" : "warn"})` }} />
                      {target !== null && <span className="absolute -top-0.5 h-3 w-0.5 bg-ink" style={{ left: `${(target / maxRate) * 100}%` }} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex justify-between text-[0.7rem] text-muted"><span>0 %</span><span>{pct(maxRate / 2, 0)}</span><span>{pct(maxRate, 0)}</span></div>
          <p className="mt-2 text-xs text-muted">* Incomplete costing: the actual food cost is understated.</p>
        </Panel>

        <Panel eyebrow="Dishes requiring attention" title={attention.length ? `${attention.length} to review` : "Nothing to review"}>
          {attention.length === 0 && <p className="text-sm text-muted">All dishes are fully costed and on target.</p>}
          <ul className="divide-y divide-line">
            {attention.map((d) => (
              <li key={d.recipe.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="mt-1.5"><Dot tone={dishTone(d.state)} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{d.recipe.name}</p>
                  <p className="text-xs text-muted">
                    {d.state === "incomplete"
                      ? d.cost.issues.filter((x) => x.severity === "error").map((x) => x.message).join(" · ")
                      : d.state === "above_target"
                        ? `Food cost ${pct(d.pricing!.actual!.foodCostRate)} vs target ${pct(d.target)} · suggested ${money(d.pricing!.suggested.menuPrice, cur, ws.locale)}`
                        : "No food-cost target for this dish or its category"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Chip tone={dishTone(d.state)}>{dishStateLabel(d.state)}</Chip>
                  <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "go", screen: "recipes", recipeId: d.recipe.id })}>Open</Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel eyebrow="Supplier prices" title="Recent price changes and their effect" actions={<Button size="sm" variant="secondary" onClick={() => dispatch({ type: "go", screen: "ingredients" })}>Ingredient master</Button>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[0.7rem] uppercase tracking-wider text-muted">
                <th className="py-2 pr-3 font-semibold">Ingredient</th>
                <th className="px-3 py-2 text-right font-semibold">Was</th>
                <th className="px-3 py-2 text-right font-semibold">Now</th>
                <th className="px-3 py-2 text-right font-semibold">Change</th>
                <th className="py-2 pl-3 font-semibold">Effect on cost per portion</th>
              </tr>
            </thead>
            <tbody>
              {priceChanges.map(({ ingredient: i, change, impacts }) => (
                <tr key={i.id} className="border-b border-line/70 align-top last:border-0">
                  <td className="py-2.5 pr-3"><p className="font-medium">{i.name}</p><p className="text-xs text-muted">{i.supplier} · {i.priceUpdated}</p></td>
                  <td className="num px-3 py-2.5 text-right text-muted">{money(i.previousPrice!.amount, i.price!.currency, ws.locale)}</td>
                  <td className="num px-3 py-2.5 text-right">{money(i.price!.amount, i.price!.currency, ws.locale)}<span className="text-xs text-muted"> / {i.price!.packQuantity} {i.price!.packUnit}</span></td>
                  <td className="px-3 py-2.5 text-right"><Chip tone={change > 0 ? "bad" : "ok"}>{change > 0 ? "+" : ""}{pct(change)}</Chip></td>
                  <td className="py-2.5 pl-3">
                    {impacts.length === 0 && <span className="text-xs text-muted">Not used in menu dishes</span>}
                    <ul className="space-y-0.5 text-xs">
                      {impacts.map((x) => (
                        <li key={x.name} className="flex justify-between gap-3"><span className="truncate">{x.name}</span><span className={`num shrink-0 ${x.delta > 0 ? "text-danger" : "text-ok"}`}>{x.delta > 0 ? "+" : ""}{money(x.delta, cur, ws.locale, 3)}</span></li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
