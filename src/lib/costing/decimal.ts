import DecimalJs from "decimal.js";

/**
 * Isolated Decimal constructor for costing. 40 significant digits internally;
 * nothing is rounded inside the engine except where a business rule (the
 * rounding policy) explicitly asks for it. Plain notation for all magnitudes
 * so results serialise deterministically.
 */
export const Decimal = DecimalJs.clone({
  precision: 40,
  rounding: DecimalJs.ROUND_HALF_UP,
  toExpNeg: -60,
  toExpPos: 60,
});
export type Decimal = DecimalJs;
export type DecimalInput = string | number | DecimalJs;

const PLAIN_DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Parses a decimal. Strings must be plain decimals ("12", "0.25", "-3.5"):
 * no exponents, thousands separators, or locale commas. Numbers must be finite.
 */
export function dec(value: DecimalInput): Decimal {
  if (DecimalJs.isDecimal(value)) {
    if (!value.isFinite()) throw new TypeError("Decimal must be finite");
    return new Decimal(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Number must be finite");
    return new Decimal(String(value));
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!PLAIN_DECIMAL.test(s)) throw new TypeError(`Not a plain decimal: "${value}"`);
    return new Decimal(s);
  }
  throw new TypeError("Expected a decimal string or number");
}

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

/** Serialises a Decimal for results and snapshots (full internal precision, plain notation). */
export const str = (d: Decimal) => d.toString();
