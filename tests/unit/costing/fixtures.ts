/**
 * Fictional test data. Every ingredient, price, rate and recipe here is invented
 * for testing; none is taken from any real business or workbook.
 * Expected values in the tests are worked out by hand from these numbers.
 */
import { METRIC_UNITS, prepareCatalog, type CatalogInput, type CostingPolicyInput, type IngredientInput, type RecipeInput } from "@/lib/costing";

export const policy = (over: Partial<CostingPolicyInput> = {}): CostingPolicyInput => ({
  id: "test-policy",
  version: 1,
  validFrom: "2026-01-01",
  currency: "EUR",
  defaultQuantityBasis: "net",
  inputTaxRecoverable: true,
  menuPriceEntry: "tax_inclusive",
  allowance: { mode: "none" },
  rounding: { mode: "none" },
  ...over,
});

const price = (amount: string, packQuantity: string, packUnit: string, extra: Partial<NonNullable<IngredientInput["price"]>> = {}) => ({
  amount, currency: "EUR", taxIncluded: false, taxRate: "0.1", packQuantity, packUnit, ...extra,
});

export const ingredients: IngredientInput[] = [
  // 12.00 per 25 kg sack → 0.00048 per g
  { id: "flour", yieldRate: "1", conversions: [], price: price("12.00", "25", "kg") },
  // 1.80 per kg, 80 % usable → 0.0018 per gross g, 0.00225 per usable g
  { id: "carrot", yieldRate: "0.8", conversions: [], price: price("1.80", "1", "kg") },
  // 8.80 per litre INCLUDING 10 % tax → 8.00 net when tax is recoverable → 0.008 per ml
  { id: "oil", yieldRate: "1", conversions: [], price: price("8.80", "1", "l", { taxIncluded: true }) },
  // 3.00 per 10 pieces; 1 piece = 50 g
  { id: "egg", yieldRate: "1", conversions: [{ fromUnit: "pcs", toUnit: "g", factor: "50" }], price: price("3.00", "10", "pcs") },
  // 3.60 per litre; 1 ml = 1.02 g
  { id: "cream", yieldRate: "1", conversions: [{ fromUnit: "ml", toUnit: "g", factor: "1.02" }], price: price("3.60", "1", "l") },
  // 10.00 USD per g; fictional rate 1 USD = 0.5 EUR → 5.00 EUR per g
  { id: "spice", yieldRate: "1", conversions: [], price: price("10.00", "1", "g", { currency: "USD" }) },
  { id: "unpriced", yieldRate: "1", conversions: [], price: null },
];

export const recipes: RecipeInput[] = [
  {
    // ingredient cost 0.45 + 0.12 + 0.36 = 0.93; yield 0.5 kg → 1.86 per kg; 4 portions → 0.2325 per portion
    id: "sauce", version: 1, portions: "4", yield: { quantity: "0.5", unit: "kg" },
    lines: [
      { kind: "ingredient", ingredientId: "carrot", quantity: "200", unit: "g" }, // net 200 → gross 250 g → 0.45
      { kind: "ingredient", ingredientId: "oil", quantity: "15", unit: "ml" }, // 0.12
      { kind: "ingredient", ingredientId: "cream", quantity: "102", unit: "g" }, // 100 ml → 0.36
    ],
  },
  {
    // 0.60 + 0.12 + 0.186 + 0.2325 = 1.1385
    id: "main", version: 3, portions: "2", yield: null,
    lines: [
      { kind: "ingredient", ingredientId: "egg", quantity: "2", unit: "pcs" }, // 0.60
      { kind: "ingredient", ingredientId: "flour", quantity: "250", unit: "g" }, // 0.12
      { kind: "recipe", recipeId: "sauce", quantity: "100", unit: "g" }, // 0.1 kg × 1.86 = 0.186
      { kind: "recipe", recipeId: "sauce", quantity: "1", unit: "portion" }, // 0.2325
    ],
  },
];

export const exchangeRates = [{ currency: "USD", rateToBase: "0.5" }];

export function catalog(over: Partial<CatalogInput> = {}) {
  return prepareCatalog({ policy: policy(), units: METRIC_UNITS, ingredients, recipes, exchangeRates, ...over });
}

export function oneLine(line: RecipeInput["lines"][number], extra: Partial<CatalogInput> = {}) {
  return catalog({ recipes: [{ id: "r", version: 1, portions: "1", yield: null, lines: [line] }], ...extra });
}
