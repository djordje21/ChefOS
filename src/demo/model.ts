/**
 * Connects the fictional demo data to the REAL costing engine. Every cost,
 * food-cost rate and suggested price shown in the demo is computed here by
 * src/lib/costing; nothing is hard-coded in the screens.
 */
import {
  CostingValidationError, costRecipe, prepareCatalog, priceDish, selectPolicy,
  type Catalog, type CostingPolicyInput, type PricingResult, type RecipeCostResult,
} from "@/lib/costing";
import type { DemoDish, DemoIngredient, DemoRecipe, DemoWorkspace } from "./data";

/** The demo's fixed "today", so the preview is reproducible. */
export const DEMO_TODAY = "2026-10-14";

export type DishView = {
  dish: DemoDish;
  recipe: DemoRecipe;
  cost: RecipeCostResult;
  /** null when neither the dish nor its category has a target (no default is ever assumed). */
  target: string | null;
  targetSource: "category" | "dish" | null;
  pricing: PricingResult | null;
  state: "on_target" | "above_target" | "incomplete" | "no_target";
};

export type Evaluation =
  | { ok: true; policy: CostingPolicyInput; catalog: Catalog; recipeCosts: Map<string, RecipeCostResult>; dishes: DishView[] }
  | { ok: false; error: string };

export function currentPolicy(ws: DemoWorkspace): CostingPolicyInput {
  const p = selectPolicy(ws.policies, DEMO_TODAY);
  return ws.policies.find((x) => x.version === p.version)!;
}

const toEngineIngredient = (i: DemoIngredient) => ({ id: i.id, name: i.name, yieldRate: i.yieldRate, conversions: i.conversions, price: i.price });
const toEngineRecipe = (r: DemoRecipe) => ({ id: r.id, version: r.version, name: r.name, portions: r.portions, yield: r.yield, lines: r.lines });

export function evaluate(ws: DemoWorkspace, ingredients: DemoIngredient[] = ws.ingredients): Evaluation {
  try {
    const policy = currentPolicy(ws);
    const catalog = prepareCatalog({
      policy,
      units: ws.units,
      ingredients: ingredients.filter((i) => i.status === "active").map(toEngineIngredient),
      recipes: ws.recipes.map(toEngineRecipe),
      exchangeRates: ws.exchangeRates,
    });
    const recipeCosts = new Map<string, RecipeCostResult>();
    for (const r of ws.recipes) {
      // The allowance applies to dishes only; a sub-recipe is shown at ingredient cost.
      recipeCosts.set(r.id, costRecipe(catalog, r.id, r.kind === "sub_recipe" ? { allowance: { mode: "none" } } : {}));
    }
    const dishes: DishView[] = ws.dishes.map((dish) => {
      const recipe = ws.recipes.find((r) => r.id === dish.recipeId)!;
      const cost = recipeCosts.get(recipe.id)!;
      const categoryTarget = ws.categories.find((c) => c.name === dish.category)?.target;
      const target = dish.targetOverride ?? categoryTarget ?? null;
      const pricing = target
        ? priceDish(policy, { portionCost: cost.costPerPortion, targetFoodCostRate: target, taxRate: ws.menuTaxRate.rate, menuPrice: dish.menuPrice })
        : null;
      const state: DishView["state"] =
        cost.status === "incomplete" ? "incomplete" : !pricing ? "no_target" : pricing.actual?.meetsTarget ? "on_target" : "above_target";
      const targetSource: DishView["targetSource"] = dish.targetOverride ? "dish" : categoryTarget ? "category" : null;
      return { dish, recipe, cost, target, targetSource, pricing, state };
    });
    return { ok: true, policy, catalog, recipeCosts, dishes };
  } catch (e) {
    if (e instanceof CostingValidationError) return { ok: false, error: e.issues.map((i) => `${i.path}: ${i.message}`).join("; ") };
    return { ok: false, error: (e as Error).message };
  }
}

/** Which recipes (directly or through sub-recipes) use an ingredient. */
export function recipesUsing(ws: DemoWorkspace, ingredientId: string): DemoRecipe[] {
  const direct = new Set(ws.recipes.filter((r) => r.lines.some((l) => l.kind === "ingredient" && l.ingredientId === ingredientId)).map((r) => r.id));
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of ws.recipes) {
      if (!direct.has(r.id) && r.lines.some((l) => l.kind === "recipe" && direct.has(l.recipeId))) {
        direct.add(r.id);
        grew = true;
      }
    }
  }
  return ws.recipes.filter((r) => direct.has(r.id));
}

/** Cost per usable base unit (per kg, l or piece) for display in the ingredient list. */
export function usableCostPer(i: DemoIngredient, ws: DemoWorkspace, policy: CostingPolicyInput): { value: number; unit: string } | null {
  if (!i.price) return null;
  const unit = ws.units.find((u) => u.code === i.price!.packUnit);
  if (!unit) return null;
  const perBase = (unit.dimension === "count" ? 1 : 1000) / Number(unit.toBase);
  let amount = Number(i.price.amount);
  const t = 1 + Number(i.price.taxRate);
  if (i.price.taxIncluded && policy.inputTaxRecoverable) amount /= t;
  if (!i.price.taxIncluded && !policy.inputTaxRecoverable) amount *= t;
  const fx = i.price.currency === policy.currency ? 1 : Number(ws.exchangeRates.find((r) => r.currency === i.price!.currency)?.rateToBase ?? NaN);
  const value = ((amount * fx) / Number(i.price.packQuantity)) * perBase / Number(i.yieldRate);
  const label = unit.dimension === "mass" ? "kg" : unit.dimension === "volume" ? "l" : "pc";
  return { value, unit: label };
}
