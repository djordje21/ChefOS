import { z } from "zod";
import { CostingValidationError } from "./errors";
import { dec, type Decimal } from "./decimal";

/*
 * Every business rule the engine applies arrives through these schemas.
 * None of them has a default: a missing rule is a validation error, never a
 * silent assumption. Rates are fractions (0.2 = 20%).
 */

const decimal = z.union([z.string(), z.number()]).transform((v, ctx): Decimal => {
  try {
    return dec(v);
  } catch (e) {
    ctx.addIssue({ code: "custom", message: (e as Error).message });
    return z.NEVER;
  }
});

const positive = decimal.refine((d) => d.gt(0), "Must be greater than 0");
const nonNegative = decimal.refine((d) => d.gte(0), "Must be 0 or greater");
/** 0 ≤ r < 1 */
const rate = decimal.refine((d) => d.gte(0) && d.lt(1), "Must be a fraction from 0 (inclusive) to 1 (exclusive)");
/** 0 < y ≤ 1 */
const yieldRate = decimal.refine((d) => d.gt(0) && d.lte(1), "Yield must be greater than 0 and at most 1");
/** 0 < t < 1 */
const targetRate = decimal.refine((d) => d.gt(0) && d.lt(1), "Target must be greater than 0 and less than 1");

const code = z.string().trim().min(1).max(64);
const currency = z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code");
export const PORTION_UNIT = "portion";

// ── Policy (versioned) ───────────────────────────────────────────────────────

const allowanceRule = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }).strict(),
  z.object({ mode: z.literal("percent_of_ingredient_cost"), rate }).strict(),
]);

const roundingRule = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }).strict(),
  z.object({ mode: z.enum(["up", "down", "half_up", "half_even"]), step: positive }).strict(),
]);

export const costingPolicySchema = z
  .object({
    id: code,
    version: z.number().int().positive(),
    validFrom: z.iso.date(),
    currency,
    /** How recipe quantities are meant when a line does not say: usable (net) or as purchased (gross). */
    defaultQuantityBasis: z.enum(["net", "gross"]),
    /** If true, tax included in purchase prices is removed; if false, tax is part of the cost. */
    inputTaxRecoverable: z.boolean(),
    /** Whether menu prices are entered and rounded including or excluding tax. */
    menuPriceEntry: z.enum(["tax_inclusive", "tax_exclusive"]),
    /** Allowance for unlisted minor ingredients; applied once, to the top-level recipe only. */
    allowance: allowanceRule,
    /** Rounding of the suggested menu price on the side the price is entered. */
    rounding: roundingRule,
  })
  .strict();

// ── Units ────────────────────────────────────────────────────────────────────

export const unitSchema = z
  .object({
    code: code.refine((c) => c !== PORTION_UNIT, `"${PORTION_UNIT}" is reserved`),
    dimension: z.enum(["mass", "volume", "count"]),
    /** Factor to the dimension's base unit (g, ml, piece). */
    toBase: positive,
  })
  .strict();

// ── Ingredients and prices ───────────────────────────────────────────────────

export const conversionSchema = z
  .object({ fromUnit: code, toUnit: code, factor: positive })
  .strict()
  .describe("1 fromUnit = factor × toUnit, for this ingredient only (e.g. 1 piece = 55 g)");

export const purchasePriceSchema = z
  .object({
    amount: nonNegative,
    currency,
    taxIncluded: z.boolean(),
    taxRate: rate,
    packQuantity: positive,
    packUnit: code,
  })
  .strict();

export const ingredientSchema = z
  .object({
    id: code,
    name: z.string().max(200).optional(),
    /** Usable share after trim/peel/bone: 0 < y ≤ 1. */
    yieldRate,
    conversions: z.array(conversionSchema),
    /** null = no approved price yet. */
    price: purchasePriceSchema.nullable(),
  })
  .strict();

export const exchangeRateSchema = z
  .object({ currency, rateToBase: positive })
  .strict()
  .describe("1 unit of `currency` = rateToBase units of the policy currency");

// ── Recipes ──────────────────────────────────────────────────────────────────

const ingredientLine = z
  .object({
    kind: z.literal("ingredient"),
    ingredientId: code,
    quantity: nonNegative,
    unit: code,
    basis: z.enum(["net", "gross"]).optional(),
    yieldOverride: yieldRate.optional(),
  })
  .strict();

const recipeLine = z
  .object({
    kind: z.literal("recipe"),
    recipeId: code,
    quantity: nonNegative,
    /** A unit compatible with the sub-recipe's yield unit, or "portion". */
    unit: code,
  })
  .strict();

export const recipeSchema = z
  .object({
    id: code,
    version: z.number().int().positive(),
    name: z.string().max(200).optional(),
    portions: positive,
    /** Output of one batch (after cooking), needed when other recipes use this one by weight or volume. */
    yield: z.object({ quantity: positive, unit: code }).strict().nullable(),
    lines: z.array(z.discriminatedUnion("kind", [ingredientLine, recipeLine])),
  })
  .strict();

// ── Pricing ──────────────────────────────────────────────────────────────────

export const pricingInputSchema = z
  .object({
    portionCost: nonNegative,
    targetFoodCostRate: targetRate,
    taxRate: rate,
    /** Current menu price, on the side given by policy.menuPriceEntry. */
    menuPrice: positive.optional(),
  })
  .strict();

export type CostingPolicy = z.output<typeof costingPolicySchema>;
export type CostingPolicyInput = z.input<typeof costingPolicySchema>;
export type UnitDef = z.output<typeof unitSchema>;
export type UnitDefInput = z.input<typeof unitSchema>;
export type Ingredient = z.output<typeof ingredientSchema>;
export type IngredientInput = z.input<typeof ingredientSchema>;
export type Recipe = z.output<typeof recipeSchema>;
export type RecipeInput = z.input<typeof recipeSchema>;
export type ExchangeRate = z.output<typeof exchangeRateSchema>;
export type ExchangeRateInput = z.input<typeof exchangeRateSchema>;
export type PricingInput = z.input<typeof pricingInputSchema>;
export type AllowanceRule = z.output<typeof allowanceRule>;
export type AllowanceRuleInput = z.input<typeof allowanceRule>;
export type RoundingRule = z.output<typeof roundingRule>;

export const allowanceRuleSchema = allowanceRule;

/** Parses with a schema, converting zod errors into CostingValidationError. */
export function parse<S extends z.ZodType>(schema: S, value: unknown, path = ""): z.output<S> {
  const r = schema.safeParse(value);
  if (!r.success) {
    throw new CostingValidationError(
      r.error.issues.map((i) => ({
        path: [path, ...i.path.map(String)].filter(Boolean).join("."),
        message: i.message,
      })),
    );
  }
  return r.data;
}
