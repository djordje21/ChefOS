import { CostingValidationError } from "./errors";
import { costingPolicySchema, parse, type CostingPolicy } from "./schema";

/**
 * Picks the policy version in force on `asOf` (YYYY-MM-DD): the latest
 * validFrom on or before that date. Versions must have unique numbers and
 * unique validFrom dates within one policy id, so the choice is unambiguous.
 */
export function selectPolicy(policies: readonly unknown[], asOf: string): CostingPolicy {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    throw new CostingValidationError([{ path: "asOf", message: "Use a YYYY-MM-DD date" }]);
  }
  const parsed = policies.map((p, i) => parse(costingPolicySchema, p, `policies.${i}`));
  const ids = new Set(parsed.map((p) => p.id));
  if (ids.size > 1) throw new CostingValidationError([{ path: "policies", message: "All versions must belong to one policy id" }]);
  const seenVersion = new Set<number>();
  const seenDate = new Set<string>();
  parsed.forEach((p, i) => {
    if (seenVersion.has(p.version)) throw new CostingValidationError([{ path: `policies.${i}.version`, message: "Duplicate version" }]);
    if (seenDate.has(p.validFrom)) throw new CostingValidationError([{ path: `policies.${i}.validFrom`, message: "Duplicate validFrom" }]);
    seenVersion.add(p.version);
    seenDate.add(p.validFrom);
  });
  const inForce = parsed.filter((p) => p.validFrom <= asOf).sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0];
  if (!inForce) throw new CostingValidationError([{ path: "asOf", message: `No policy version is in force on ${asOf}` }]);
  return inForce;
}
