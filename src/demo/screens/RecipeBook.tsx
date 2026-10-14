"use client";

import { useState, type FormEvent } from "react";
import type { DemoRecipe } from "../data";
import { date, isPlainDecimal, money, pct, qty } from "../format";
import { DEMO_TODAY } from "../model";
import { useDemo } from "../store";
import { Button, Chip, Panel, SelectInput, StatusTag, TextInput, cx, inputClass } from "../ui";
import { dishStateLabel, dishTone } from "./RecipeCosting";

/** The 14 allergen groups commonly declared on menus in Europe. */
const ALLERGENS = ["Celery", "Crustaceans", "Eggs", "Fish", "Gluten", "Lupin", "Milk", "Molluscs", "Mustard", "Nuts", "Peanuts", "Sesame", "Soya", "Sulphites"];

type Kind = "all" | "dish" | "sub_recipe";

export function RecipeBook() {
  const { state, ws, evaluation } = useDemo();
  const [kind, setKind] = useState<Kind>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const outletOk = (r: DemoRecipe) => state.outletId === "all" || r.outletId === state.outletId || r.outletId === null;
  const open = ws.recipes.find((r) => r.id === openId && outletOk(r)) ?? null;

  if (creating) {
    return (
      <NewRecipe
        onCancel={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          setOpenId(id);
        }}
      />
    );
  }
  if (open) return <RecipeDetail recipe={open} onBack={() => setOpenId(null)} />;

  const q = search.trim().toLowerCase();
  const list = ws.recipes
    .filter(outletOk)
    .filter((r) => kind === "all" || r.kind === kind)
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.method.toLowerCase().includes(q))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "dish" ? -1 : 1));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2">Recipe book <StatusTag kind="prototype" /></p>
          <h1 className="display mt-1 text-2xl sm:text-[1.7rem]">{ws.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Every dish and sub-recipe in this workspace, with method, allergens and live cost. All recipes here are fictional.</p>
        </div>
        <Button onClick={() => setCreating(true)}>New recipe</Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-sm" role="tablist" aria-label="Recipe type">
          {([["all", "All"], ["dish", "Menu dishes"], ["sub_recipe", "Sub-recipes"]] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
              className={cx("rounded-md px-3 py-1.5 font-semibold transition", kind === k ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink")}>
              {label}
            </button>
          ))}
        </div>
        <TextInput className="max-w-xs flex-1" placeholder="Search name or method" aria-label="Search recipes" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <Panel><p className="text-sm text-muted">No recipes match.</p></Panel>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => {
            const cost = evaluation.ok ? evaluation.recipeCosts.get(r.id) : undefined;
            const dv = evaluation.ok ? evaluation.dishes.find((d) => d.recipe.id === r.id) : undefined;
            return (
              <li key={r.id}>
                <button onClick={() => setOpenId(r.id)}
                  className="group flex h-full w-full flex-col rounded-xl border border-line bg-surface p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-line-strong">
                  <span className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="truncate">{r.outletId ? ws.outlets.find((o) => o.id === r.outletId)?.name : "Shared library"}</span>
                    <Chip tone={r.approval === "approved" ? "ok" : "warn"}>{r.approval === "approved" ? `v${r.version} approved` : `v${r.version} draft`}</Chip>
                  </span>
                  <span className="display mt-2 block text-lg leading-snug group-hover:text-accent">{r.name}</span>
                  <span className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{r.method || "No method written yet."}</span>
                  <span className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-3 text-xs">
                    <span className="text-muted">{r.kind === "dish" ? `${qty(r.portions)} portion${r.portions === "1" ? "" : "s"}` : `Batch ${r.yield ? `${qty(r.yield.quantity)} ${r.yield.unit}` : "—"}`}</span>
                    {cost?.status === "incomplete" ? (
                      <Chip tone="warn">Cost incomplete</Chip>
                    ) : dv ? (
                      <Chip tone={dishTone(dv.state)}>{dv.pricing?.actual ? `FC ${pct(dv.pricing.actual.foodCostRate)}` : dishStateLabel(dv.state)}</Chip>
                    ) : (
                      <span className="num">{cost ? money(cost.costPerPortion, cost.currency, ws.locale) : "—"} / portion</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecipeDetail({ recipe, onBack }: { recipe: DemoRecipe; onBack: () => void }) {
  const { ws, evaluation, dispatch } = useDemo();
  const cost = evaluation.ok ? evaluation.recipeCosts.get(recipe.id) : undefined;
  const dv = evaluation.ok ? evaluation.dishes.find((d) => d.recipe.id === recipe.id) : undefined;
  const outlet = ws.outlets.find((o) => o.id === recipe.outletId);
  const lineName = (l: DemoRecipe["lines"][number]) =>
    l.kind === "ingredient" ? ws.ingredients.find((i) => i.id === l.ingredientId)?.name ?? "Unknown ingredient" : ws.recipes.find((r) => r.id === l.recipeId)?.name ?? "Unknown sub-recipe";

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack}>← All recipes</Button>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0 rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">
          <p className="eyebrow">{recipe.kind === "dish" ? `${outlet?.name ?? "—"} · ${dv?.dish.category ?? "Menu dish"}` : "Shared sub-recipe"}</p>
          <h1 className="display mt-1 text-2xl sm:text-3xl">{recipe.name}</h1>
          <p className="mt-2 text-xs text-muted">Version {recipe.version} · {recipe.approval === "approved" ? "approved" : "draft"} · updated {date(recipe.updated)}</p>

          <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                Ingredients · {recipe.kind === "dish" ? `${qty(recipe.portions)} portion${recipe.portions === "1" ? "" : "s"}` : `batch ${recipe.yield ? `${qty(recipe.yield.quantity)} ${recipe.yield.unit}` : "—"}`}
              </h2>
              {recipe.lines.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No ingredients yet. Add them in Food Cost.</p>
              ) : (
                <ul className="mt-3 divide-y divide-dashed divide-line text-sm">
                  {recipe.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2">
                      <span className="min-w-0">{lineName(l)}{l.kind === "recipe" && <span className="ml-1.5 text-xs text-info">sub-recipe</span>}</span>
                      <span className="num shrink-0 text-muted">{qty(l.quantity)} {l.unit}{l.kind === "ingredient" && l.basis === "gross" ? " (gross)" : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Method</h2>
              <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed">{recipe.method || "No method written yet."}</p>
              <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-muted">Allergens</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recipe.allergens.length === 0 ? <span className="text-sm text-muted">None declared</span> : recipe.allergens.map((a) => <Chip key={a} tone="warn">{a}</Chip>)}
              </div>
              <p className="mt-2 text-xs text-muted">Demo declaration only. Real allergen records will be reviewed and versioned.</p>
            </section>
          </div>
        </article>

        <aside className="space-y-4">
          <Panel eyebrow="Live cost" title={cost ? `${money(cost.costPerPortion, cost.currency, ws.locale)} per portion` : "—"}>
            {cost?.status === "incomplete" ? (
              <p className="text-sm text-warn">Cost is incomplete: {cost.issues.length} item{cost.issues.length === 1 ? "" : "s"} need attention.</p>
            ) : (
              <p className="text-sm text-muted">Calculated by the ChefOS costing engine from fictional prices.</p>
            )}
            {dv?.pricing?.actual && (
              <p className="mt-3 flex items-center justify-between text-sm">
                <span>Food cost</span>
                <Chip tone={dishTone(dv.state)}>{pct(dv.pricing.actual.foodCostRate)} · {dishStateLabel(dv.state)}</Chip>
              </p>
            )}
            <Button className="mt-4 w-full" onClick={() => dispatch({ type: "go", screen: "recipes", recipeId: recipe.id })}>Open in Food Cost</Button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function NewRecipe({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const { state, ws, evaluation, dispatch } = useDemo();
  const [kind, setKind] = useState<"dish" | "sub_recipe">("dish");
  const [error, setError] = useState<string | null>(null);
  const [allergens, setAllergens] = useState<string[]>([]);
  const inclusive = evaluation.ok && evaluation.policy.menuPriceEntry === "tax_inclusive";
  const defaultOutlet = state.outletId !== "all" ? state.outletId : ws.outlets[0]!.id;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim().replace(",", ".");
    const name = get("name");
    const portions = get("portions");
    if (!name) return setError("Give the recipe a name.");
    if (name.length > 80) return setError("Keep the name under 80 characters.");
    if (!isPlainDecimal(portions) || Number(portions) <= 0) return setError("Portions must be a number greater than 0.");
    const id = `draft-${Date.now().toString(36)}`;
    const base: DemoRecipe = {
      id, name, kind, version: 1, approval: "draft", portions, lines: [], method: get("method"), allergens, updated: DEMO_TODAY,
      outletId: kind === "dish" ? get("outlet") : null, yield: null,
    };
    if (kind === "dish") {
      const price = get("menuPrice");
      if (!isPlainDecimal(price) || Number(price) <= 0) return setError("Menu price must be a number greater than 0.");
      dispatch({ type: "addRecipe", recipe: base, dish: { recipeId: id, category: get("category"), menuPrice: price, targetOverride: null, pricedBy: "portion" } });
    } else {
      const y = get("yieldQty");
      if (!isPlainDecimal(y) || Number(y) <= 0) return setError("Batch yield must be a number greater than 0.");
      dispatch({ type: "addRecipe", recipe: { ...base, yield: { quantity: y, unit: get("yieldUnit") } }, dish: null });
    }
    onCreated(id);
  };

  const label = "block text-xs font-semibold uppercase tracking-wider text-muted";
  const field = "mt-1 text-sm font-medium normal-case tracking-normal";
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button variant="ghost" size="sm" onClick={onCancel}>← All recipes</Button>
      <Panel eyebrow="Recipe book" title="New recipe" actions={<StatusTag kind="prototype" />}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-sm text-muted">The recipe is kept in this browser tab only. Add ingredients afterwards in Food Cost to see its cost.</p>
          <div className="flex rounded-lg border border-line bg-surface-2 p-0.5 text-sm" role="radiogroup" aria-label="Recipe type">
            {(["dish", "sub_recipe"] as const).map((k) => (
              <button type="button" key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                className={cx("flex-1 rounded-md px-3 py-1.5 font-semibold transition", kind === k ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink")}>
                {k === "dish" ? "Menu dish" : "Sub-recipe"}
              </button>
            ))}
          </div>
          <label className={label}>Name<TextInput name="name" className={field} required maxLength={80} autoFocus /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            {kind === "dish" ? (
              <>
                <label className={label}>Outlet
                  <SelectInput name="outlet" className={field} defaultValue={defaultOutlet}>
                    {ws.outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </SelectInput>
                </label>
                <label className={label}>Menu category
                  <SelectInput name="category" className={field}>
                    {ws.categories.map((c) => <option key={c.name}>{c.name}</option>)}
                  </SelectInput>
                </label>
                <label className={label}>Portions<TextInput name="portions" className={field} inputMode="decimal" defaultValue="1" /></label>
                <label className={label}>Menu price ({inclusive ? "incl. tax" : "excl. tax"})<TextInput name="menuPrice" className={field} inputMode="decimal" placeholder="e.g. 18.50" /></label>
              </>
            ) : (
              <>
                <label className={label}>Portions per batch<TextInput name="portions" className={field} inputMode="decimal" defaultValue="10" /></label>
                <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
                  <label className={label}>Batch yield<TextInput name="yieldQty" className={field} inputMode="decimal" placeholder="e.g. 1.5" /></label>
                  <label className={label}>Unit
                    <SelectInput name="yieldUnit" className={field} defaultValue="kg">
                      {["kg", "g", "l", "ml", "pcs"].map((u) => <option key={u}>{u}</option>)}
                    </SelectInput>
                  </label>
                </div>
              </>
            )}
          </div>
          <label className={label}>Method<textarea name="method" rows={4} className={cx(inputClass, "w-full", field)} /></label>
          <fieldset>
            <legend className={label}>Allergens</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALLERGENS.map((a) => {
                const on = allergens.includes(a);
                return (
                  <button type="button" key={a} aria-pressed={on} onClick={() => setAllergens(on ? allergens.filter((x) => x !== a) : [...allergens, a])}
                    className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold transition", on ? "border-warn/40 bg-warn-soft text-warn" : "border-line text-muted hover:text-ink")}>
                    {a}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Add to recipe book</Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
