import { CostingDataProblem, CostingValidationError } from "./errors";
import type { Decimal } from "./decimal";
import { parse, unitSchema, type Ingredient, type UnitDef, type UnitDefInput } from "./schema";

/**
 * Metric units and their physical factors. Physics, not business rules:
 * callers may use this list, extend it, or supply their own entirely.
 */
export const METRIC_UNITS: readonly UnitDefInput[] = [
  { code: "mg", dimension: "mass", toBase: "0.001" },
  { code: "g", dimension: "mass", toBase: "1" },
  { code: "kg", dimension: "mass", toBase: "1000" },
  { code: "ml", dimension: "volume", toBase: "1" },
  { code: "cl", dimension: "volume", toBase: "10" },
  { code: "dl", dimension: "volume", toBase: "100" },
  { code: "l", dimension: "volume", toBase: "1000" },
  { code: "pcs", dimension: "count", toBase: "1" },
];

export type UnitRegistry = ReadonlyMap<string, UnitDef>;

export function unitRegistry(units: readonly unknown[]): UnitRegistry {
  const map = new Map<string, UnitDef>();
  units.forEach((u, i) => {
    const unit = parse(unitSchema, u, `units.${i}`);
    if (map.has(unit.code)) throw new CostingValidationError([{ path: `units.${i}.code`, message: `Duplicate unit "${unit.code}"` }]);
    map.set(unit.code, unit);
  });
  return map;
}

function unitOf(units: UnitRegistry, code: string): UnitDef {
  const u = units.get(code);
  if (!u) throw new CostingDataProblem("MISSING_CONVERSION", `Unknown unit "${code}"`);
  return u;
}

/** Same-dimension conversion through base factors. */
function scale(qty: Decimal, from: UnitDef, to: UnitDef): Decimal {
  return qty.times(from.toBase).dividedBy(to.toBase);
}

/**
 * Converts a quantity between units. Within one dimension it uses the unit
 * factors; across dimensions (pieces ↔ grams, millilitres ↔ grams) it uses ONLY
 * the ingredient's explicit conversions. It never guesses.
 */
export function convert(
  qty: Decimal,
  fromCode: string,
  toCode: string,
  units: UnitRegistry,
  conversions: Ingredient["conversions"] = [],
): Decimal {
  if (fromCode === toCode) return qty;
  const from = unitOf(units, fromCode);
  const to = unitOf(units, toCode);
  if (from.dimension === to.dimension) return scale(qty, from, to);

  for (const c of conversions) {
    const cFrom = unitOf(units, c.fromUnit);
    const cTo = unitOf(units, c.toUnit);
    if (cFrom.dimension === from.dimension && cTo.dimension === to.dimension) {
      return scale(scale(qty, from, cFrom).times(c.factor), cTo, to);
    }
    if (cTo.dimension === from.dimension && cFrom.dimension === to.dimension) {
      return scale(scale(qty, from, cTo).dividedBy(c.factor), cFrom, to);
    }
  }
  throw new CostingDataProblem(
    "MISSING_CONVERSION",
    `No conversion from ${from.dimension} (${fromCode}) to ${to.dimension} (${toCode}) is defined for this ingredient`,
  );
}

/** Each pair of dimensions may have at most one conversion per ingredient, so results never depend on list order. */
export function assertUnambiguousConversions(ingredient: Ingredient, units: UnitRegistry, path: string) {
  const seen = new Set<string>();
  ingredient.conversions.forEach((c, i) => {
    const a = units.get(c.fromUnit);
    const b = units.get(c.toUnit);
    if (!a || !b) {
      throw new CostingValidationError([{ path: `${path}.conversions.${i}`, message: `Unknown unit in conversion` }]);
    }
    if (a.dimension === b.dimension) {
      throw new CostingValidationError([
        { path: `${path}.conversions.${i}`, message: "Conversions are only for different dimensions; same-dimension units convert by their factors" },
      ]);
    }
    const key = [a.dimension, b.dimension].sort().join("↔");
    if (seen.has(key)) {
      throw new CostingValidationError([{ path: `${path}.conversions.${i}`, message: `More than one ${key} conversion` }]);
    }
    seen.add(key);
  });
}

