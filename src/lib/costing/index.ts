/**
 * ChefOS costing engine — pure, deterministic, decimal-safe.
 * No database, no UI, no business constants: every rule is passed in as
 * validated configuration (see schema.ts). Not yet wired into the app.
 */
export { Decimal, dec } from "./decimal";
export { CostingValidationError, ISSUE_SEVERITY, type CostingIssue, type IssueCode } from "./errors";
export { costRecipe, prepareCatalog, scaleRecipe, type Catalog, type CatalogInput, type LineResult, type RecipeCostResult } from "./recipe";
export { priceDish, roundPrice, type PricingResult } from "./pricing";
export { selectPolicy } from "./policy";
export { METRIC_UNITS, convert, unitRegistry } from "./units";
export { PORTION_UNIT, type CostingPolicyInput, type IngredientInput, type RecipeInput, type UnitDefInput } from "./schema";
export { ENGINE_VERSION } from "./version";
