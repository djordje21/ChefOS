import { Decimal, ONE, str } from "./decimal";
import { costingPolicySchema, parse, pricingInputSchema, type CostingPolicy, type PricingInput, type RoundingRule } from "./schema";
import { ENGINE_VERSION } from "./version";

/*
 *   net selling price        = price excluding tax
 *   food cost rate           = portion cost ÷ net selling price
 *   suggested net price      = portion cost ÷ target food cost rate
 *   contribution per portion = net selling price − portion cost
 *     (before labour, overheads, payment fees and other operating costs — not profit)
 * Rounding (if any) applies to the price on the side it is entered
 * (tax-inclusive or tax-exclusive, per policy); the other side is derived.
 */

const MODES = {
  up: Decimal.ROUND_CEIL,
  down: Decimal.ROUND_FLOOR,
  half_up: Decimal.ROUND_HALF_UP,
  half_even: Decimal.ROUND_HALF_EVEN,
} as const;

export function roundPrice(value: Decimal, rule: RoundingRule): Decimal {
  if (rule.mode === "none") return value;
  return value.dividedBy(rule.step).toDecimalPlaces(0, MODES[rule.mode]).times(rule.step);
}

export type PricingResult = {
  engineVersion: string;
  policy: { id: string; version: number };
  currency: string;
  portionCost: string;
  targetFoodCostRate: string;
  taxRate: string;
  suggested: {
    netPrice: string;
    grossPrice: string;
    /** The rounded price on the entry side (gross if tax-inclusive, net if tax-exclusive). */
    menuPrice: string;
    foodCostRate: string;
  };
  actual: null | {
    menuPrice: string;
    netPrice: string;
    grossPrice: string;
    foodCostRate: string;
    contribution: string;
    meetsTarget: boolean;
  };
};

export function priceDish(policyInput: unknown, input: PricingInput): PricingResult {
  const policy: CostingPolicy = parse(costingPolicySchema, policyInput, "policy");
  const p = parse(pricingInputSchema, input, "pricing");
  const taxFactor = ONE.plus(p.taxRate);
  const inclusive = policy.menuPriceEntry === "tax_inclusive";
  const toNet = (entered: Decimal) => (inclusive ? entered.dividedBy(taxFactor) : entered);
  const toGross = (entered: Decimal) => (inclusive ? entered : entered.times(taxFactor));

  const rawNet = p.portionCost.dividedBy(p.targetFoodCostRate);
  const suggestedEntered = roundPrice(inclusive ? rawNet.times(taxFactor) : rawNet, policy.rounding);
  const suggestedNet = toNet(suggestedEntered);

  let actual: PricingResult["actual"] = null;
  if (p.menuPrice) {
    const net = toNet(p.menuPrice);
    const rate = p.portionCost.dividedBy(net);
    actual = {
      menuPrice: str(p.menuPrice),
      netPrice: str(net),
      grossPrice: str(toGross(p.menuPrice)),
      foodCostRate: str(rate),
      contribution: str(net.minus(p.portionCost)),
      meetsTarget: rate.lte(p.targetFoodCostRate),
    };
  }

  return {
    engineVersion: ENGINE_VERSION,
    policy: { id: policy.id, version: policy.version },
    currency: policy.currency,
    portionCost: str(p.portionCost),
    targetFoodCostRate: str(p.targetFoodCostRate),
    taxRate: str(p.taxRate),
    suggested: {
      netPrice: str(suggestedNet),
      grossPrice: str(toGross(suggestedEntered)),
      menuPrice: str(suggestedEntered),
      foodCostRate: suggestedNet.isZero() ? "0" : str(p.portionCost.dividedBy(suggestedNet)),
    },
    actual,
  };
}
