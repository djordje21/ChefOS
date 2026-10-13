# ChefOS — Costing Engine (Phase 2.1)

`src/lib/costing/` is a pure TypeScript module built on `decimal.js`. It has **no** database access, **no** UI, and **no** business constants. It is not yet wired into the app; Phase 2.2 connects it to workspace configuration stored in the database.

## Guarantees

* **Decimal-safe.** All arithmetic uses decimal.js with 40 significant digits. Inputs are plain decimal strings (`"12.50"`) or finite numbers; exponents, thousands separators and locale commas are rejected. Values are rounded only where a policy rule asks for it, which happens solely in menu-price rounding. Results are full-precision decimal strings; rounding for display is the caller's job.
* **No hidden rules.** Every rule arrives in a validated, versioned `CostingPolicy`. Nothing has a default, unknown keys are rejected, and a missing rule is a validation error. A test also fails if a fractional literal (e.g. `0.2`) appears anywhere in the engine except the physical unit table.
* **Deterministic and traceable.** The same input gives a byte-identical result. Each result carries `engineVersion` plus the policy `id` and `version`. `selectPolicy(versions, date)` picks the version in force on a date, so a past calculation can be reproduced from the policy version and prices of that time.
* **Problems are reported, not guessed.** Invalid configuration throws `CostingValidationError` with field paths. Data gaps do not throw: each one becomes an issue on the line and the recipe, the line cost is left `null`, and the status is `incomplete`.
  * Issues that make the recipe incomplete: missing price, missing conversion, missing exchange rate, missing ingredient or recipe, sub-recipe without a yield, cycle, empty recipe.
  * Issues that are warnings only (status `complete_with_warnings`): zero quantity, zero price.

## Definitions

| Term | Definition |
|---|---|
| Gross (as-purchased) quantity | What is taken from stock, before trim/peel/bone loss |
| Net (usable) quantity | What ends up in the dish: `net = gross × yield` |
| Yield | `0 < y ≤ 1`, set per ingredient; a recipe line can override it |
| Quantity basis | Each line is `net` or `gross`. If the line does not say, the policy's `defaultQuantityBasis` applies. Yield is applied **once** |
| Purchase cost per pack unit | `price ÷ pack quantity`, after tax treatment and currency conversion |
| Tax treatment | Price includes tax and tax is recoverable → tax removed. Price excludes tax and tax is not recoverable → tax added. Otherwise the price is used as entered |
| Currency | A price in another currency needs an explicit exchange rate (`1 unit = rateToBase × policy currency`). Rates are never fetched |
| Line cost | `gross quantity (converted to the pack unit) × purchase cost per pack unit` |
| Unit conversion | Within a dimension (mass, volume, count): by unit factors. **Across** dimensions: only through the ingredient's own explicit conversions (e.g. `1 pcs = 55 g`, `1 ml = 1.03 g`); never guessed. At most one conversion per pair of dimensions per ingredient |
| Sub-recipe | Used by weight or volume (needs a batch yield): `quantity × (sub ingredient cost ÷ yield)`. Used by `"portion"`: `quantity × (sub ingredient cost ÷ portions)`. Its lines are never counted twice. Cycles are detected |
| Allowance | `ingredient cost × rate`, applied once, to the top-level recipe only. The policy rule can be overridden per call (e.g. per category or dish) |
| Cost per portion | `(ingredient cost + allowance) ÷ portions` |
| Scaling | `scaleRecipe(recipe, portions)` multiplies every quantity and the batch yield by `target ÷ portions`; cost per portion is unchanged |
| Net selling price | Price excluding tax |
| Food cost rate | `portion cost ÷ net selling price` |
| Suggested price | `portion cost ÷ target`. It is rounded (none / up / down / half-up / half-even, with a step) on the side the menu price is entered (tax-inclusive or tax-exclusive); the other side is derived from it |
| Contribution | `net price − portion cost`: before labour, overheads and fees. **Not profit** |

## API

```ts
import { prepareCatalog, costRecipe, scaleRecipe, priceDish, selectPolicy, METRIC_UNITS } from "@/lib/costing";

const catalog = prepareCatalog({ policy, units: METRIC_UNITS, ingredients, recipes, exchangeRates }); // validates everything
const result = costRecipe(catalog, "recipe-id", { allowance /* optional override */ });
const pricing = priceDish(policy, { portionCost: result.costPerPortion, targetFoodCostRate: "0.3", taxRate: "0.1", menuPrice: "12.50" });
```

## Tests

The engine tests are `tests/unit/costing/*.test.ts`: 77 tests on **fictional** data, with every expected value worked out by hand. They cover decimal parsing, unit and cross-dimension conversions, pack sizes, the four tax-treatment combinations, currency, net/gross basis and yield, sub-recipes by weight and by portion, cycles, allowance placement and overrides, issue reporting, scaling across several factors, every rounding mode including midpoints, pricing on both entry sides, validation of every rule, policy version selection, determinism, and the no-constants check.

A mutation check was run by hand: four deliberate defects were introduced (yield applied twice, allowance inside sub-recipes, round-up behaving as nearest, recoverable tax not removed). The suite failed for every one of them.

## Not in scope yet

* Persisting policies, prices and results (Phase 2.2).
* Snapshots.
* UI.
* Reconciliation against the private workbook. It will run locally against `private/` only and never in git.
