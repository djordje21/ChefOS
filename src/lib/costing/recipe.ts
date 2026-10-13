import { CostingDataProblem, CostingValidationError, issue, type CostingIssue } from "./errors";
import { ONE, ZERO, str, type Decimal } from "./decimal";
import {
  PORTION_UNIT, allowanceRuleSchema, costingPolicySchema, exchangeRateSchema, ingredientSchema, parse, recipeSchema,
  type AllowanceRule, type AllowanceRuleInput, type CostingPolicy, type ExchangeRate, type Ingredient, type Recipe,
  type RecipeInput,
} from "./schema";
import { assertUnambiguousConversions, convert, unitRegistry, type UnitRegistry } from "./units";
import { ENGINE_VERSION } from "./version";

/*
 * Quantity definitions used throughout:
 *   gross (as purchased) quantity — what is taken from stock, before trim/peel/bone loss.
 *   net (usable) quantity         — what ends up in the recipe:  net = gross × yield.
 *   line cost                     = gross quantity × purchase cost per unit
 *                                 = net quantity × (purchase cost per unit ÷ yield).
 * Yield is applied exactly once per line. A line states its basis ("net" or "gross");
 * when it does not, the policy's defaultQuantityBasis applies.
 *
 *   recipe ingredient cost = Σ line costs (sub-recipes contribute their own ingredient cost pro rata)
 *   allowance              = ingredient cost × allowance rate   (top-level recipe only, never inside sub-recipes)
 *   total cost             = ingredient cost + allowance
 *   cost per portion       = total cost ÷ portions
 */

export type Catalog = {
  policy: CostingPolicy;
  units: UnitRegistry;
  ingredients: ReadonlyMap<string, Ingredient>;
  recipes: ReadonlyMap<string, Recipe>;
  exchangeRates: ReadonlyMap<string, ExchangeRate>;
};

export type CatalogInput = {
  policy: unknown;
  units: readonly unknown[];
  ingredients: readonly unknown[];
  recipes: readonly unknown[];
  exchangeRates?: readonly unknown[];
};

function indexById<T extends { id: string }>(items: readonly unknown[], schema: Parameters<typeof parse>[0], path: string) {
  const map = new Map<string, T>();
  items.forEach((raw, i) => {
    const item = parse(schema, raw, `${path}.${i}`) as T;
    if (map.has(item.id)) throw new CostingValidationError([{ path: `${path}.${i}.id`, message: `Duplicate id "${item.id}"` }]);
    map.set(item.id, item);
  });
  return map;
}

/** Validates everything up front. Invalid configuration throws; nothing is half-computed. */
export function prepareCatalog(input: CatalogInput): Catalog {
  const policy = parse(costingPolicySchema, input.policy, "policy");
  const units = unitRegistry(input.units);
  const ingredients = indexById<Ingredient>(input.ingredients, ingredientSchema, "ingredients");
  const recipes = indexById<Recipe>(input.recipes, recipeSchema, "recipes");
  const exchangeRates = new Map<string, ExchangeRate>();
  (input.exchangeRates ?? []).forEach((raw, i) => {
    const r = parse(exchangeRateSchema, raw, `exchangeRates.${i}`);
    if (r.currency === policy.currency) {
      throw new CostingValidationError([{ path: `exchangeRates.${i}`, message: "Exchange rate for the policy currency itself" }]);
    }
    if (exchangeRates.has(r.currency)) throw new CostingValidationError([{ path: `exchangeRates.${i}`, message: `Duplicate rate for ${r.currency}` }]);
    exchangeRates.set(r.currency, r);
  });

  const unknownUnit = (code: string, path: string) => {
    if (!units.has(code)) throw new CostingValidationError([{ path, message: `Unknown unit "${code}"` }]);
  };
  for (const [id, ing] of ingredients) {
    assertUnambiguousConversions(ing, units, `ingredients.${id}`);
    if (ing.price) unknownUnit(ing.price.packUnit, `ingredients.${id}.price.packUnit`);
  }
  for (const [id, r] of recipes) {
    if (r.yield) unknownUnit(r.yield.unit, `recipes.${id}.yield.unit`);
    r.lines.forEach((l, i) => {
      if (!(l.kind === "recipe" && l.unit === PORTION_UNIT)) unknownUnit(l.unit, `recipes.${id}.lines.${i}.unit`);
    });
  }
  return { policy, units, ingredients, recipes, exchangeRates };
}

export type LineResult = {
  line: number;
  kind: "ingredient" | "recipe";
  ref: string;
  quantity: string;
  unit: string;
  basis?: "net" | "gross";
  yieldRate?: string;
  grossQuantity?: string;
  netQuantity?: string;
  /** null when the cost cannot be determined (see issues). */
  cost: string | null;
  issues: CostingIssue[];
};

export type RecipeCostResult = {
  engineVersion: string;
  policy: { id: string; version: number };
  currency: string;
  recipe: { id: string; version: number; portions: string; yield: { quantity: string; unit: string } | null };
  lines: LineResult[];
  /** Sum of the line costs that could be determined. */
  ingredientCost: string;
  allowance: { mode: AllowanceRule["mode"]; rate: string | null; amount: string };
  totalCost: string;
  costPerPortion: string;
  /** Total cost per unit of batch yield (null when the recipe has no yield). */
  costPerYieldUnit: string | null;
  status: "complete" | "complete_with_warnings" | "incomplete";
  issues: CostingIssue[];
};

/** Purchase cost per 1 pack unit, in the policy currency, with tax treated per policy. */
function purchaseCostPerPackUnit(ing: Ingredient, cat: Catalog): Decimal {
  const p = ing.price;
  if (!p) throw new CostingDataProblem("MISSING_PRICE", `No price for ingredient "${ing.id}"`);
  let amount = p.amount;
  const taxFactor = ONE.plus(p.taxRate);
  if (p.taxIncluded && cat.policy.inputTaxRecoverable) amount = amount.dividedBy(taxFactor);
  if (!p.taxIncluded && !cat.policy.inputTaxRecoverable) amount = amount.times(taxFactor);
  if (p.currency !== cat.policy.currency) {
    const fx = cat.exchangeRates.get(p.currency);
    if (!fx) throw new CostingDataProblem("MISSING_EXCHANGE_RATE", `No exchange rate for ${p.currency}`);
    amount = amount.times(fx.rateToBase);
  }
  return amount.dividedBy(p.packQuantity);
}

type Internal = { ingredientCost: Decimal; complete: boolean; result: RecipeCostResult };

function costInternal(cat: Catalog, recipeId: string, stack: string[], memo: Map<string, Internal>, allowance: AllowanceRule): Internal {
  const recipe = cat.recipes.get(recipeId)!;
  const lines: LineResult[] = [];
  const issues: CostingIssue[] = [];
  let ingredientCost = ZERO;
  let complete = true;

  if (recipe.lines.length === 0) {
    issues.push(issue("NO_LINES", `Recipe "${recipe.id}" has no lines`));
    complete = false;
  }

  recipe.lines.forEach((line, index) => {
    const n = index + 1;
    const lineIssues: CostingIssue[] = [];
    const ref = line.kind === "ingredient" ? line.ingredientId : line.recipeId;
    const out: LineResult = { line: n, kind: line.kind, ref, quantity: str(line.quantity), unit: line.unit, cost: null, issues: lineIssues };
    if (line.quantity.isZero()) lineIssues.push(issue("ZERO_QUANTITY", "Quantity is 0", { line: n, ref }));

    try {
      if (line.kind === "ingredient") {
        const ing = cat.ingredients.get(line.ingredientId);
        if (!ing) throw new CostingDataProblem("MISSING_INGREDIENT", `Unknown ingredient "${line.ingredientId}"`);
        const basis = line.basis ?? cat.policy.defaultQuantityBasis;
        const y = line.yieldOverride ?? ing.yieldRate;
        const gross = basis === "net" ? line.quantity.dividedBy(y) : line.quantity;
        const net = basis === "net" ? line.quantity : line.quantity.times(y);
        Object.assign(out, { basis, yieldRate: str(y), grossQuantity: str(gross), netQuantity: str(net) });
        const perPackUnit = purchaseCostPerPackUnit(ing, cat);
        if (ing.price!.amount.isZero()) lineIssues.push(issue("ZERO_PRICE", `Price of "${ing.id}" is 0`, { line: n, ref }));
        const grossInPackUnit = convert(gross, line.unit, ing.price!.packUnit, cat.units, ing.conversions);
        out.cost = str(grossInPackUnit.times(perPackUnit));
      } else {
        if (!cat.recipes.has(line.recipeId)) throw new CostingDataProblem("MISSING_RECIPE", `Unknown recipe "${line.recipeId}"`);
        if (stack.includes(line.recipeId) || line.recipeId === recipe.id) {
          throw new CostingDataProblem("RECIPE_CYCLE", `Recipe cycle: ${[...stack, recipe.id, line.recipeId].join(" → ")}`);
        }
        const sub = memo.get(line.recipeId) ?? costInternal(cat, line.recipeId, [...stack, recipe.id], memo, { mode: "none" });
        memo.set(line.recipeId, sub);
        if (!sub.complete) throw new CostingDataProblem("SUB_RECIPE_INCOMPLETE", `Sub-recipe "${line.recipeId}" is incomplete`);
        const subRecipe = cat.recipes.get(line.recipeId)!;
        let cost: Decimal;
        if (line.unit === PORTION_UNIT) {
          cost = line.quantity.times(sub.ingredientCost.dividedBy(subRecipe.portions));
        } else {
          if (!subRecipe.yield) throw new CostingDataProblem("MISSING_YIELD", `Sub-recipe "${subRecipe.id}" has no batch yield`);
          const qty = convert(line.quantity, line.unit, subRecipe.yield.unit, cat.units);
          cost = qty.times(sub.ingredientCost.dividedBy(subRecipe.yield.quantity));
        }
        out.cost = str(cost);
      }
    } catch (e) {
      if (!(e instanceof CostingDataProblem)) throw e;
      lineIssues.push(issue(e.code, e.message, { line: n, ref }));
    }

    if (out.cost === null) complete = false;
    else ingredientCost = ingredientCost.plus(out.cost);
    lines.push(out);
    issues.push(...lineIssues);
  });

  const allowanceAmount = allowance.mode === "none" ? ZERO : ingredientCost.times(allowance.rate);
  const total = ingredientCost.plus(allowanceAmount);
  const hasWarnings = issues.some((i) => i.severity === "warning");

  const result: RecipeCostResult = {
    engineVersion: ENGINE_VERSION,
    policy: { id: cat.policy.id, version: cat.policy.version },
    currency: cat.policy.currency,
    recipe: {
      id: recipe.id,
      version: recipe.version,
      portions: str(recipe.portions),
      yield: recipe.yield ? { quantity: str(recipe.yield.quantity), unit: recipe.yield.unit } : null,
    },
    lines,
    ingredientCost: str(ingredientCost),
    allowance: { mode: allowance.mode, rate: allowance.mode === "none" ? null : str(allowance.rate), amount: str(allowanceAmount) },
    totalCost: str(total),
    costPerPortion: str(total.dividedBy(recipe.portions)),
    costPerYieldUnit: recipe.yield ? str(total.dividedBy(recipe.yield.quantity)) : null,
    status: !complete ? "incomplete" : hasWarnings ? "complete_with_warnings" : "complete",
    issues,
  };
  return { ingredientCost, complete, result };
}

/**
 * Costs one recipe. `allowance` overrides the policy allowance for this call
 * (e.g. a category- or dish-specific rule supplied by the caller).
 */
export function costRecipe(cat: Catalog, recipeId: string, options: { allowance?: AllowanceRuleInput } = {}): RecipeCostResult {
  if (!cat.recipes.has(recipeId)) throw new CostingValidationError([{ path: "recipeId", message: `Unknown recipe "${recipeId}"` }]);
  const allowance = options.allowance ? parse(allowanceRuleSchema, options.allowance, "allowance") : cat.policy.allowance;
  return costInternal(cat, recipeId, [], new Map(), allowance).result;
}

/** Returns a copy of the recipe scaled to `targetPortions` (quantities and batch yield scale linearly). */
export function scaleRecipe(recipe: RecipeInput, targetPortions: string | number): RecipeInput {
  const r = parse(recipeSchema, recipe, "recipe");
  const target = parse(recipeSchema.shape.portions, targetPortions, "targetPortions");
  const factor = target.dividedBy(r.portions);
  return {
    ...recipe,
    portions: str(target),
    yield: r.yield ? { quantity: str(r.yield.quantity.times(factor)), unit: r.yield.unit } : null,
    lines: recipe.lines.map((l, i) => ({ ...l, quantity: str(r.lines[i]!.quantity.times(factor)) })),
  };
}
