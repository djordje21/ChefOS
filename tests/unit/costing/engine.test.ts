import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CostingValidationError, Decimal, ENGINE_VERSION, METRIC_UNITS, convert, costRecipe, dec, prepareCatalog, priceDish,
  roundPrice, scaleRecipe, selectPolicy, unitRegistry,
} from "@/lib/costing";
import { catalog, exchangeRates, ingredients, oneLine, policy, recipes } from "./fixtures";

const units = unitRegistry(METRIC_UNITS);
const n = (s: string | null) => (s === null ? null : new Decimal(s));
const eq = (actual: string | null, expected: string) => expect(n(actual)?.equals(expected), `${actual} ≠ ${expected}`).toBe(true);
const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

describe("decimal input", () => {
  it.each(["12", "0.25", "-3.5", " 7 ", 3, 0.1])("accepts %p", (v) => expect(() => dec(v)).not.toThrow());
  it.each(["1e3", "1,5", "12,000.00", "abc", "", "NaN", Number.NaN, Number.POSITIVE_INFINITY])("rejects %p", (v) =>
    expect(() => dec(v as string)).toThrow(),
  );
  it("has no floating-point drift", () => {
    const c = oneLine(
      { kind: "ingredient", ingredientId: "dime", quantity: "3", unit: "pcs" },
      { ingredients: [{ id: "dime", yieldRate: "1", conversions: [], price: { amount: "0.1", currency: "EUR", taxIncluded: false, taxRate: "0", packQuantity: "1", packUnit: "pcs" } }] },
    );
    expect(costRecipe(c, "r").totalCost).toBe("0.3");
  });
});

describe("unit conversion", () => {
  it.each([
    ["1", "kg", "g", "1000"],
    ["250", "g", "kg", "0.25"],
    ["1.5", "l", "ml", "1500"],
    ["33", "cl", "l", "0.33"],
    ["2", "dl", "ml", "200"],
    ["500", "mg", "g", "0.5"],
  ])("%s %s → %s %s", (q, from, to, expected) => eq(convert(dec(q), from, to, units).toString(), expected));

  it("never converts between dimensions without an explicit ingredient conversion", () => {
    expect(() => convert(dec("1"), "pcs", "g", units)).toThrow(/No conversion/);
    expect(() => convert(dec("1"), "ml", "g", units)).toThrow(/No conversion/);
  });

  it("uses ingredient conversions in both directions and across unit sizes", () => {
    const egg = [{ fromUnit: "pcs", toUnit: "g", factor: dec("50") }];
    eq(convert(dec("2"), "pcs", "g", units, egg).toString(), "100");
    eq(convert(dec("0.3"), "kg", "pcs", units, egg).toString(), "6");
    const cream = [{ fromUnit: "ml", toUnit: "g", factor: dec("1.02") }];
    eq(convert(dec("1"), "l", "kg", units, cream).toString(), "1.02");
    eq(convert(dec("204"), "g", "dl", units, cream).toString(), "2");
  });

  it("rejects ambiguous, same-dimension or unknown-unit conversions", () => {
    const bad = (conversions: unknown[]) =>
      catalog({ ingredients: [{ id: "x", yieldRate: "1", conversions, price: null }], recipes: [] });
    expect(() => bad([{ fromUnit: "pcs", toUnit: "g", factor: "50" }, { fromUnit: "pcs", toUnit: "kg", factor: "0.05" }])).toThrow(/More than one/);
    expect(() => bad([{ fromUnit: "kg", toUnit: "g", factor: "1000" }])).toThrow(/different dimensions/);
    expect(() => bad([{ fromUnit: "box", toUnit: "g", factor: "1" }])).toThrow(/Unknown unit/);
    expect(() => bad([{ fromUnit: "pcs", toUnit: "g", factor: "0" }])).toThrow(CostingValidationError);
  });

  it("rejects duplicate units and the reserved 'portion' unit", () => {
    expect(() => unitRegistry([...METRIC_UNITS, { code: "g", dimension: "mass", toBase: "1" }])).toThrow(/Duplicate unit/);
    expect(() => unitRegistry([{ code: "portion", dimension: "count", toBase: "1" }])).toThrow(/reserved/);
  });
});

describe("ingredient line: gross, net, yield and purchase cost", () => {
  it("net basis: yield inflates the purchased quantity", () => {
    const r = costRecipe(oneLine({ kind: "ingredient", ingredientId: "carrot", quantity: "200", unit: "g", basis: "net" }), "r");
    const l = r.lines[0]!;
    expect([l.basis, l.netQuantity, l.grossQuantity, l.yieldRate]).toEqual(["net", "200", "250", "0.8"]);
    eq(l.cost, "0.45");
  });

  it("gross basis: yield is not applied again", () => {
    const l = costRecipe(oneLine({ kind: "ingredient", ingredientId: "carrot", quantity: "200", unit: "g", basis: "gross" }), "r").lines[0]!;
    expect([l.basis, l.grossQuantity, l.netQuantity]).toEqual(["gross", "200", "160"]);
    eq(l.cost, "0.36");
  });

  it("the policy decides the basis when the line does not", () => {
    const line = { kind: "ingredient" as const, ingredientId: "carrot", quantity: "200", unit: "g" };
    eq(costRecipe(oneLine(line), "r").lines[0]!.cost, "0.45");
    eq(costRecipe(oneLine(line, { policy: policy({ defaultQuantityBasis: "gross" }) }), "r").lines[0]!.cost, "0.36");
  });

  it("a line can override the ingredient yield", () => {
    eq(costRecipe(oneLine({ kind: "ingredient", ingredientId: "carrot", quantity: "200", unit: "g", yieldOverride: "0.5" }), "r").lines[0]!.cost, "0.72");
  });

  it("net quantity × usable cost equals gross quantity × purchase cost", () => {
    const l = costRecipe(oneLine({ kind: "ingredient", ingredientId: "carrot", quantity: "123.45", unit: "g" }), "r").lines[0]!;
    eq(l.cost, dec("123.45").times(dec("1.80").dividedBy(1000).dividedBy("0.8")).toString());
  });

  it("pack sizes: a 25 kg sack, a 10-piece box", () => {
    eq(costRecipe(oneLine({ kind: "ingredient", ingredientId: "flour", quantity: "1", unit: "kg" }), "r").totalCost, "0.48");
    eq(costRecipe(oneLine({ kind: "ingredient", ingredientId: "egg", quantity: "3", unit: "pcs" }), "r").totalCost, "0.9");
    eq(costRecipe(oneLine({ kind: "ingredient", ingredientId: "egg", quantity: "150", unit: "g" }), "r").totalCost, "0.9");
  });

  it.each([
    // [taxIncluded, inputTaxRecoverable, expected cost of 1 l]
    [true, true, "8"], // 8.80 incl. 10 % → 8.00 recoverable
    [true, false, "8.8"], // tax is a cost
    [false, true, "8.8"], // already net
    [false, false, "9.68"], // 8.80 + 10 % unrecoverable tax
  ])("purchase tax: included=%s recoverable=%s → %s", (taxIncluded, recoverable, expected) => {
    const c = oneLine(
      { kind: "ingredient", ingredientId: "oil", quantity: "1", unit: "l" },
      {
        policy: policy({ inputTaxRecoverable: recoverable }),
        ingredients: [{ id: "oil", yieldRate: "1", conversions: [], price: { amount: "8.80", currency: "EUR", taxIncluded, taxRate: "0.1", packQuantity: "1", packUnit: "l" } }],
      },
    );
    eq(costRecipe(c, "r").totalCost, expected);
  });

  it("foreign-currency prices need an explicit exchange rate", () => {
    eq(costRecipe(oneLine({ kind: "ingredient", ingredientId: "spice", quantity: "0.1", unit: "g" }), "r").totalCost, "0.5");
    const r = costRecipe(oneLine({ kind: "ingredient", ingredientId: "spice", quantity: "0.1", unit: "g" }, { exchangeRates: [] }), "r");
    expect(r.status).toBe("incomplete");
    expect(codes(r)).toEqual(["MISSING_EXCHANGE_RATE"]);
  });

  it("rejects an exchange rate for the policy currency or duplicates", () => {
    expect(() => catalog({ exchangeRates: [{ currency: "EUR", rateToBase: "1" }] })).toThrow(/policy currency/);
    expect(() => catalog({ exchangeRates: [...exchangeRates, ...exchangeRates] })).toThrow(/Duplicate rate/);
  });
});

describe("recipe totals, allowance and sub-recipes", () => {
  it("costs the sub-recipe on its own", () => {
    const r = costRecipe(catalog(), "sauce");
    eq(r.ingredientCost, "0.93");
    eq(r.costPerYieldUnit, "1.86");
    eq(r.costPerPortion, "0.2325");
    expect(r.status).toBe("complete");
  });

  it("uses sub-recipes by weight and by portion without double counting", () => {
    const r = costRecipe(catalog(), "main");
    expect(r.lines.map((l) => l.cost)).toEqual(["0.6", "0.12", "0.186", "0.2325"]);
    eq(r.ingredientCost, "1.1385");
    eq(r.totalCost, "1.1385");
    eq(r.costPerPortion, "0.56925");
    expect(r.recipe).toEqual({ id: "main", version: 3, portions: "2", yield: null });
  });

  it("applies the allowance once, at the top level only", () => {
    const c = catalog({ policy: policy({ allowance: { mode: "percent_of_ingredient_cost", rate: "0.05" } }) });
    const r = costRecipe(c, "main");
    expect(r.lines.map((l) => l.cost)).toEqual(["0.6", "0.12", "0.186", "0.2325"]); // sub-recipes carry no allowance
    eq(r.allowance.amount, "0.056925");
    eq(r.totalCost, "1.195425");
    eq(r.costPerPortion, "0.5977125");
  });

  it("a caller can override the allowance (e.g. per category or dish)", () => {
    const c = catalog({ policy: policy({ allowance: { mode: "percent_of_ingredient_cost", rate: "0.05" } }) });
    eq(costRecipe(c, "main", { allowance: { mode: "none" } }).totalCost, "1.1385");
    eq(costRecipe(c, "main", { allowance: { mode: "percent_of_ingredient_cost", rate: "0.1" } }).totalCost, "1.25235");
    expect(() => costRecipe(c, "main", { allowance: { mode: "percent_of_ingredient_cost", rate: "1.5" } })).toThrow(CostingValidationError);
  });

  it("detects cycles", () => {
    const c = catalog({
      recipes: [
        { id: "a", version: 1, portions: "1", yield: { quantity: "1", unit: "kg" }, lines: [{ kind: "recipe", recipeId: "b", quantity: "1", unit: "kg" }] },
        { id: "b", version: 1, portions: "1", yield: { quantity: "1", unit: "kg" }, lines: [{ kind: "recipe", recipeId: "a", quantity: "1", unit: "kg" }] },
        { id: "self", version: 1, portions: "1", yield: null, lines: [{ kind: "recipe", recipeId: "self", quantity: "1", unit: "portion" }] },
      ],
    });
    expect(codes(costRecipe(c, "a"))).toEqual(["SUB_RECIPE_INCOMPLETE"]);
    expect(codes(costRecipe(c, "self"))).toEqual(["RECIPE_CYCLE"]);
  });

  it("needs a batch yield to use a sub-recipe by weight, and a compatible unit", () => {
    const base = { id: "base", version: 1, portions: "2", yield: null, lines: [{ kind: "ingredient" as const, ingredientId: "flour", quantity: "100", unit: "g" }] };
    const c = catalog({
      recipes: [
        base,
        { id: "byWeight", version: 1, portions: "1", yield: null, lines: [{ kind: "recipe", recipeId: "base", quantity: "50", unit: "g" }] },
        { id: "byPortion", version: 1, portions: "1", yield: null, lines: [{ kind: "recipe", recipeId: "base", quantity: "1", unit: "portion" }] },
        { id: "byVolume", version: 1, portions: "1", yield: null, lines: [{ kind: "recipe", recipeId: "sauce", quantity: "50", unit: "ml" }] },
        { id: "sauce", version: 1, portions: "1", yield: { quantity: "1", unit: "kg" }, lines: [{ kind: "ingredient", ingredientId: "flour", quantity: "1", unit: "g" }] },
      ],
    });
    expect(codes(costRecipe(c, "byWeight"))).toEqual(["MISSING_YIELD"]);
    eq(costRecipe(c, "byPortion").totalCost, "0.024");
    expect(codes(costRecipe(c, "byVolume"))).toEqual(["MISSING_CONVERSION"]);
  });

  it("reports data problems instead of inventing numbers", () => {
    const c = catalog({
      recipes: [
        {
          id: "messy", version: 1, portions: "1", yield: null,
          lines: [
            { kind: "ingredient", ingredientId: "unpriced", quantity: "10", unit: "g" },
            { kind: "ingredient", ingredientId: "ghost", quantity: "10", unit: "g" },
            { kind: "ingredient", ingredientId: "egg", quantity: "1", unit: "ml" },
            { kind: "recipe", recipeId: "nowhere", quantity: "1", unit: "portion" },
            { kind: "ingredient", ingredientId: "flour", quantity: "0", unit: "g" },
            { kind: "ingredient", ingredientId: "flour", quantity: "100", unit: "g" },
          ],
        },
        { id: "empty", version: 1, portions: "1", yield: null, lines: [] },
      ],
    });
    const r = costRecipe(c, "messy");
    expect(codes(r)).toEqual(["MISSING_PRICE", "MISSING_INGREDIENT", "MISSING_CONVERSION", "MISSING_RECIPE", "ZERO_QUANTITY"]);
    expect(r.lines.map((l) => l.cost)).toEqual([null, null, null, null, "0", "0.048"]);
    expect(r.status).toBe("incomplete");
    eq(r.ingredientCost, "0.048"); // known part only, flagged incomplete
    expect(codes(costRecipe(c, "empty"))).toEqual(["NO_LINES"]);
  });

  it("zero quantity or zero price is a warning, not an error", () => {
    const r = costRecipe(oneLine({ kind: "ingredient", ingredientId: "flour", quantity: "0", unit: "g" }), "r");
    expect(r.status).toBe("complete_with_warnings");
    const free = oneLine(
      { kind: "ingredient", ingredientId: "herb", quantity: "5", unit: "g" },
      { ingredients: [{ id: "herb", yieldRate: "1", conversions: [], price: { amount: "0", currency: "EUR", taxIncluded: false, taxRate: "0", packQuantity: "1", packUnit: "kg" } }] },
    );
    const f = costRecipe(free, "r");
    expect([f.status, codes(f)]).toEqual(["complete_with_warnings", ["ZERO_PRICE"]]);
  });
});

describe("scaling", () => {
  it.each(["0.5", "1", "3", "7.25", "100"])("scaling 'main' to %s portions keeps cost per portion and scales totals", (target) => {
    const scaled = scaleRecipe(recipes[1]!, target);
    const c = catalog({ recipes: [recipes[0]!, scaled] });
    const r = costRecipe(c, "main");
    eq(r.costPerPortion, "0.56925");
    eq(r.totalCost, dec("1.1385").times(dec(target).dividedBy(2)).toString());
    expect(r.recipe.portions).toBe(dec(target).toString());
  });

  it("scales batch yield with the quantities", () => {
    const s = scaleRecipe(recipes[0]!, "10");
    expect(s.yield).toEqual({ quantity: "1.25", unit: "kg" });
    expect(s.lines.map((l) => l.quantity)).toEqual(["500", "37.5", "255"]);
  });

  it("rejects non-positive targets", () => {
    expect(() => scaleRecipe(recipes[0]!, "0")).toThrow(CostingValidationError);
    expect(() => scaleRecipe(recipes[0]!, "-2")).toThrow(CostingValidationError);
  });
});

describe("menu pricing and VAT", () => {
  const p = (over = {}) => policy({ rounding: { mode: "up", step: "0.5" }, ...over });

  it("tax-inclusive entry: suggested price rounds the gross price, never below target with 'up'", () => {
    const r = priceDish(p(), { portionCost: "3.10", targetFoodCostRate: "0.3", taxRate: "0.1" });
    // net 10.333…, gross 11.3666… → up to 11.50 gross → net 10.4545…
    expect(r.suggested.menuPrice).toBe("11.5");
    expect(r.suggested.grossPrice).toBe("11.5");
    eq(r.suggested.netPrice, dec("11.5").dividedBy("1.1").toString());
    expect(dec(r.suggested.foodCostRate).lte("0.3")).toBe(true);
  });

  it("tax-exclusive entry rounds the net price", () => {
    const r = priceDish(p({ menuPriceEntry: "tax_exclusive" }), { portionCost: "3.10", targetFoodCostRate: "0.3", taxRate: "0.1" });
    expect([r.suggested.menuPrice, r.suggested.netPrice, r.suggested.grossPrice]).toEqual(["10.5", "10.5", "11.55"]);
  });

  it.each([
    ["none", undefined, dec("3.10").dividedBy("0.3").times("1.1").toString()],
    ["up", "0.5", "11.5"],
    ["down", "0.5", "11"],
    ["half_up", "0.5", "11.5"],
    ["half_even", "0.5", "11.5"],
    ["up", "1", "12"],
  ])("rounding %s step %s", (mode, step, expected) => {
    const rounding = mode === "none" ? { mode: "none" as const } : { mode: mode as "up", step: step! };
    const r = priceDish(policy({ rounding }), { portionCost: "3.10", targetFoodCostRate: "0.3", taxRate: "0.1" });
    eq(r.suggested.menuPrice, expected);
  });

  it("half_up vs half_even differ exactly at the midpoint; exact multiples are unchanged", () => {
    const step = { step: dec("0.05") };
    expect(roundPrice(dec("11.225"), { mode: "half_up", ...step }).toString()).toBe("11.25");
    expect(roundPrice(dec("11.225"), { mode: "half_even", ...step }).toString()).toBe("11.2");
    expect(roundPrice(dec("11.25"), { mode: "up", ...step }).toString()).toBe("11.25");
    expect(roundPrice(dec("11.25"), { mode: "down", ...step }).toString()).toBe("11.25");
  });

  it("actual food cost, net price and contribution from a menu price", () => {
    const r = priceDish(p(), { portionCost: "3.10", targetFoodCostRate: "0.3", taxRate: "0.1", menuPrice: "12.10" });
    expect(r.actual).toMatchObject({ menuPrice: "12.1", netPrice: "11", grossPrice: "12.1", contribution: "7.9", meetsTarget: true });
    eq(r.actual!.foodCostRate, dec("3.10").dividedBy(11).toString());
    const over = priceDish(p(), { portionCost: "3.10", targetFoodCostRate: "0.25", taxRate: "0.1", menuPrice: "12.10" });
    expect(over.actual!.meetsTarget).toBe(false);
  });

  it("zero tax and zero cost are handled", () => {
    const r = priceDish(policy(), { portionCost: "0", targetFoodCostRate: "0.3", taxRate: "0", menuPrice: "5" });
    expect([r.suggested.menuPrice, r.actual!.foodCostRate, r.actual!.contribution]).toEqual(["0", "0", "5"]);
  });

  it.each([
    [{ targetFoodCostRate: "0" }],
    [{ targetFoodCostRate: "1" }],
    [{ targetFoodCostRate: "-0.2" }],
    [{ taxRate: "1" }],
    [{ taxRate: "-0.1" }],
    [{ menuPrice: "0" }],
    [{ portionCost: "-1" }],
    [{ portionCost: "abc" }],
  ])("rejects invalid pricing input %p", (bad) => {
    expect(() => priceDish(policy(), { portionCost: "3", targetFoodCostRate: "0.3", taxRate: "0.1", ...bad })).toThrow(CostingValidationError);
  });
});

describe("policy configuration and versions", () => {
  it("has no defaults: every rule must be supplied", () => {
    try {
      prepareCatalog({ policy: {}, units: METRIC_UNITS, ingredients: [], recipes: [] });
      expect.unreachable();
    } catch (e) {
      const paths = (e as CostingValidationError).issues.map((i) => i.path);
      expect(paths).toEqual(expect.arrayContaining([
        "policy.id", "policy.version", "policy.validFrom", "policy.currency", "policy.defaultQuantityBasis",
        "policy.inputTaxRecoverable", "policy.menuPriceEntry", "policy.allowance", "policy.rounding",
      ]));
    }
  });

  it("rejects unknown keys and out-of-range rules", () => {
    expect(() => catalog({ policy: { ...policy(), vatRate: "0.2" } })).toThrow(CostingValidationError);
    expect(() => catalog({ policy: policy({ allowance: { mode: "percent_of_ingredient_cost", rate: "1" } }) })).toThrow(CostingValidationError);
    expect(() => catalog({ policy: policy({ rounding: { mode: "up", step: "0" } }) })).toThrow(CostingValidationError);
    expect(() => catalog({ policy: policy({ currency: "eur" }) })).toThrow(CostingValidationError);
  });

  it("rejects invalid yields, quantities and portions", () => {
    for (const yieldRate of ["0", "1.01", "-0.5"]) {
      expect(() => catalog({ ingredients: [{ ...ingredients[0]!, yieldRate }] })).toThrow(/Yield/);
    }
    const r = (over: object) => catalog({ recipes: [{ id: "x", version: 1, portions: "1", yield: null, lines: [], ...over }] });
    expect(() => r({ portions: "0" })).toThrow(CostingValidationError);
    expect(() => r({ lines: [{ kind: "ingredient", ingredientId: "flour", quantity: "-1", unit: "g" }] })).toThrow(CostingValidationError);
    expect(() => r({ lines: [{ kind: "ingredient", ingredientId: "flour", quantity: "1", unit: "cup" }] })).toThrow(/Unknown unit/);
    expect(() => catalog({ recipes: [...recipes, recipes[0]!] })).toThrow(/Duplicate id/);
    expect(() => costRecipe(catalog(), "nope")).toThrow(/Unknown recipe/);
  });

  it("selects the version in force on a date", () => {
    const v1 = policy({ version: 1, validFrom: "2026-01-01" });
    const v2 = policy({ version: 2, validFrom: "2026-07-01", rounding: { mode: "up", step: "1" } });
    expect(selectPolicy([v2, v1], "2026-06-30").version).toBe(1);
    expect(selectPolicy([v2, v1], "2026-07-01").version).toBe(2);
    expect(() => selectPolicy([v1, v2], "2025-12-31")).toThrow(/No policy version/);
    expect(() => selectPolicy([v1, policy({ version: 1, validFrom: "2026-03-01" })], "2026-05-01")).toThrow(/Duplicate version/);
    expect(() => selectPolicy([v1, policy({ version: 2 })], "2026-05-01")).toThrow(/Duplicate validFrom/);
    expect(() => selectPolicy([v1, policy({ id: "other", version: 2, validFrom: "2026-02-01" })], "2026-05-01")).toThrow(/one policy id/);
  });

  it("results are deterministic and traceable to engine and policy versions", () => {
    const a = costRecipe(catalog(), "main");
    const b = costRecipe(catalog(), "main");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.engineVersion).toBe(ENGINE_VERSION);
    expect(a.policy).toEqual({ id: "test-policy", version: 1 });
    const v2 = costRecipe(catalog({ policy: policy({ version: 2, validFrom: "2026-07-01", allowance: { mode: "percent_of_ingredient_cost", rate: "0.05" } }) }), "main");
    expect(v2.policy.version).toBe(2);
    expect(v2.totalCost).not.toBe(a.totalCost);
  });
});

describe("no business constants in the engine", () => {
  it("engine source contains no fractional literals outside the physical unit table", () => {
    const dir = path.resolve(import.meta.dirname, "../../../src/lib/costing");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts") && x !== "units.ts")) {
      const src = readFileSync(path.join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(src.match(/(?<![\w.])\d+\.\d+(?![\w.])/g), f).toBeNull();
    }
  });
});
