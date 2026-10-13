/** Thrown when configuration or input fails validation. Nothing is computed. */
export class CostingValidationError extends Error {
  constructor(public readonly issues: { path: string; message: string }[]) {
    super(`Invalid costing input: ${issues.map((i) => `${i.path || "(root)"}: ${i.message}`).join("; ")}`);
    this.name = "CostingValidationError";
  }
}

/**
 * Data problems found while costing. They do not throw; they are reported on the
 * result so a UI can show exactly what is missing.
 *   error   → the figure is incomplete (excluded or unknown)
 *   warning → the figure is complete but deserves attention
 */
export type IssueCode =
  | "MISSING_INGREDIENT"
  | "MISSING_RECIPE"
  | "MISSING_PRICE"
  | "MISSING_CONVERSION"
  | "MISSING_EXCHANGE_RATE"
  | "MISSING_YIELD"
  | "RECIPE_CYCLE"
  | "SUB_RECIPE_INCOMPLETE"
  | "NO_LINES"
  | "ZERO_QUANTITY"
  | "ZERO_PRICE";

export const ISSUE_SEVERITY: Record<IssueCode, "error" | "warning"> = {
  MISSING_INGREDIENT: "error",
  MISSING_RECIPE: "error",
  MISSING_PRICE: "error",
  MISSING_CONVERSION: "error",
  MISSING_EXCHANGE_RATE: "error",
  MISSING_YIELD: "error",
  RECIPE_CYCLE: "error",
  SUB_RECIPE_INCOMPLETE: "error",
  NO_LINES: "error",
  ZERO_QUANTITY: "warning",
  ZERO_PRICE: "warning",
};

export type CostingIssue = { code: IssueCode; severity: "error" | "warning"; message: string; line?: number; ref?: string };

export function issue(code: IssueCode, message: string, extra: { line?: number; ref?: string } = {}): CostingIssue {
  return { code, severity: ISSUE_SEVERITY[code], message, ...extra };
}

/** Internal signal for a data problem discovered deep in a calculation. */
export class CostingDataProblem extends Error {
  constructor(public readonly code: IssueCode, message: string) {
    super(message);
  }
}
