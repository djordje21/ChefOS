/**
 * DEMO DATA — entirely fictional. Restaurant names, suppliers, prices, rates,
 * targets and recipes are invented for the interface preview. Nothing here is
 * taken from any real business, workbook or price list, and none of it is a
 * default for real workspaces.
 */
import { METRIC_UNITS, type CostingPolicyInput, type UnitDefInput } from "@/lib/costing";

export type DemoPrice = {
  amount: string;
  currency: string;
  taxIncluded: boolean;
  taxRate: string;
  packQuantity: string;
  packUnit: string;
};

export type DemoIngredient = {
  id: string;
  name: string;
  category: string;
  supplier: string | null;
  supplierCode: string | null;
  yieldRate: string;
  conversions: { fromUnit: string; toUnit: string; factor: string }[];
  price: DemoPrice | null;
  priceUpdated: string | null;
  previousPrice: { amount: string; date: string } | null;
  status: "active" | "archived";
};

export type DemoLine =
  | { kind: "ingredient"; ingredientId: string; quantity: string; unit: string; basis?: "net" | "gross" }
  | { kind: "recipe"; recipeId: string; quantity: string; unit: string };

export type DemoRecipe = {
  id: string;
  name: string;
  kind: "dish" | "sub_recipe";
  outletId: string | null; // null = shared library
  version: number;
  approval: "draft" | "approved";
  portions: string;
  yield: { quantity: string; unit: string } | null;
  lines: DemoLine[];
  method: string;
  allergens: string[];
  updated: string;
};

export type DemoDish = {
  recipeId: string;
  category: string;
  menuPrice: string; // entered per policy.menuPriceEntry
  targetOverride: string | null;
  pricedBy: "portion" | "100 g";
};

export type DemoCategory = { name: string; target: string };

export type DemoWorkspace = {
  id: string;
  name: string;
  role: string;
  locale: string;
  outlets: { id: string; name: string; type: string }[];
  policies: CostingPolicyInput[];
  menuTaxRate: { name: string; rate: string };
  exchangeRates: { currency: string; rateToBase: string }[];
  categories: DemoCategory[];
  units: readonly UnitDefInput[];
  ingredients: DemoIngredient[];
  recipes: DemoRecipe[];
  dishes: DemoDish[];
};

const eur = (amount: string, packQuantity: string, packUnit: string, extra: Partial<DemoPrice> = {}): DemoPrice => ({
  amount, currency: "EUR", taxIncluded: false, taxRate: "0.1", packQuantity, packUnit, ...extra,
});

const ing = (
  id: string, name: string, category: string, supplier: string | null, code: string | null, yieldRate: string,
  price: DemoPrice | null, priceUpdated: string | null, previous: DemoIngredient["previousPrice"] = null,
  conversions: DemoIngredient["conversions"] = [],
): DemoIngredient => ({
  id, name, category, supplier, supplierCode: code, yieldRate, conversions, price, priceUpdated, previousPrice: previous, status: "active",
});

const harbourPolicy: CostingPolicyInput = {
  id: "harbour-costing",
  version: 2,
  validFrom: "2026-09-01",
  currency: "EUR",
  defaultQuantityBasis: "net",
  inputTaxRecoverable: true,
  menuPriceEntry: "tax_inclusive",
  allowance: { mode: "percent_of_ingredient_cost", rate: "0.025" },
  rounding: { mode: "up", step: "0.5" },
};

export const DEMO_WORKSPACES: DemoWorkspace[] = [
  {
    id: "ws-harbour",
    name: "Harbour & Pine Group",
    role: "Executive Chef",
    locale: "en-GB",
    outlets: [
      { id: "out-dining", name: "Pine Dining Room", type: "Restaurant" },
      { id: "out-terrace", name: "Harbour Terrace Bar", type: "Bar / Lounge" },
      { id: "out-events", name: "Events Kitchen", type: "Banqueting" },
    ],
    policies: [{ ...harbourPolicy, version: 1, validFrom: "2026-01-01", rounding: { mode: "half_up", step: "0.5" } }, harbourPolicy],
    menuTaxRate: { name: "Food & drink (demo rate)", rate: "0.1" },
    exchangeRates: [{ currency: "USD", rateToBase: "0.92" }],
    categories: [
      { name: "Starters", target: "0.28" },
      { name: "Mains", target: "0.31" },
      { name: "Desserts", target: "0.24" },
      { name: "Bar snacks", target: "0.26" },
    ],
    units: METRIC_UNITS,
    ingredients: [
      ing("chicken-supreme", "Chicken supreme, skin on", "Meat & poultry", "Northfield Farms", "NF-2210", "0.92", eur("21.50", "2.5", "kg"), "2026-10-06", { amount: "20.40", date: "2026-08-14" }),
      ing("chicken-bones", "Chicken carcasses", "Meat & poultry", "Northfield Farms", "NF-0904", "1", eur("6.00", "10", "kg"), "2026-07-02"),
      ing("sea-bass", "Sea bass fillet, pin-boned", "Fish & seafood", "Coastline Fish Co.", "CF-118", "0.95", eur("24.80", "1", "kg"), "2026-10-09", { amount: "22.00", date: "2026-09-02" }),
      ing("arborio", "Arborio rice", "Dry goods", "Larder & Co.", "LC-5521", "1", eur("11.25", "5", "kg"), "2026-05-20"),
      ing("mushrooms", "Chestnut mushrooms", "Produce", "Greenrow Produce", "GR-311", "0.9", eur("9.60", "2", "kg"), "2026-10-07", { amount: "10.40", date: "2026-09-20" }),
      ing("shallots", "Banana shallots", "Produce", "Greenrow Produce", "GR-140", "0.85", eur("8.75", "5", "kg"), "2026-09-28"),
      ing("fennel", "Fennel bulb", "Produce", "Greenrow Produce", "GR-207", "0.75", eur("3.40", "1", "kg"), "2026-10-07"),
      ing("carrots", "Carrots", "Produce", "Greenrow Produce", "GR-102", "0.85", eur("9.00", "10", "kg"), "2026-09-28"),
      ing("celery", "Celery", "Produce", "Greenrow Produce", "GR-115", "0.8", eur("2.60", "1", "kg"), "2026-09-28"),
      ing("lemons", "Lemons, unwaxed", "Produce", "Greenrow Produce", "GR-020", "1", eur("3.20", "1", "kg"), "2026-09-28", null, [{ fromUnit: "pcs", toUnit: "g", factor: "110" }]),
      ing("thyme", "Thyme, bunch", "Herbs", "Greenrow Produce", "GR-501", "1", eur("1.20", "1", "pcs"), "2026-09-28", null, [{ fromUnit: "pcs", toUnit: "g", factor: "25" }]),
      ing("microgreens", "Microgreens mix", "Herbs", "Greenrow Produce", "GR-560", "0.9", eur("3.80", "100", "g"), "2026-10-01"),
      ing("butter", "Unsalted butter", "Dairy & eggs", "Valley Dairy", "VD-001", "1", eur("9.40", "1", "kg"), "2026-09-15", { amount: "8.90", date: "2026-06-01" }),
      ing("cream", "Double cream", "Dairy & eggs", "Valley Dairy", "VD-014", "1", eur("4.10", "1", "l"), "2026-09-15"),
      ing("parmesan", "Parmesan, 24 months", "Dairy & eggs", "Valley Dairy", "VD-230", "0.95", eur("22.00", "1", "kg"), "2026-09-15"),
      ing("eggs", "Free-range eggs", "Dairy & eggs", "Valley Dairy", "VD-100", "1", eur("7.50", "30", "pcs"), "2026-09-15", null, [{ fromUnit: "pcs", toUnit: "g", factor: "58" }]),
      ing("olive-oil", "Olive oil, extra virgin", "Oils & vinegars", "Larder & Co.", "LC-0710", "1", eur("41.00", "5", "l", { taxIncluded: true }), "2026-08-30"),
      ing("vinegar", "White wine vinegar", "Oils & vinegars", "Larder & Co.", "LC-0731", "1", eur("3.20", "1", "l"), "2026-08-30"),
      ing("white-wine", "White wine, cooking", "Wine & spirits", "Cellar Supply", "CS-301", "1", eur("5.90", "0.75", "l", { taxIncluded: true, taxRate: "0.2" }), "2026-08-30"),
      ing("chocolate", "Dark chocolate 70 %", "Pastry", "Larder & Co.", "LC-9120", "1", eur("31.00", "2.5", "kg"), "2026-09-02"),
      ing("sugar", "Caster sugar", "Pastry", "Larder & Co.", "LC-9001", "1", eur("23.50", "25", "kg"), "2026-05-20"),
      ing("vanilla", "Vanilla pods", "Pastry", "Spice Route Imports", "SR-77", "1", { amount: "38.00", currency: "USD", taxIncluded: false, taxRate: "0.1", packQuantity: "25", packUnit: "pcs" }, "2026-09-10", null, [{ fromUnit: "pcs", toUnit: "g", factor: "3" }]),
      ing("sea-salt", "Sea salt flakes", "Dry goods", "Larder & Co.", "LC-0102", "1", eur("12.90", "1.5", "kg"), "2026-05-20"),
      ing("saffron", "Saffron threads", "Dry goods", "Spice Route Imports", null, "1", null, null),
    ],
    recipes: [
      {
        id: "jus", name: "Brown chicken jus", kind: "sub_recipe", outletId: null, version: 4, approval: "approved",
        portions: "24", yield: { quantity: "1.2", unit: "l" }, updated: "2026-09-30",
        method: "Roast bones and mirepoix, deglaze, simmer 6 h, strain and reduce.",
        allergens: ["Celery", "Milk", "Sulphites"],
        lines: [
          { kind: "ingredient", ingredientId: "chicken-bones", quantity: "2000", unit: "g", basis: "gross" },
          { kind: "ingredient", ingredientId: "carrots", quantity: "300", unit: "g" },
          { kind: "ingredient", ingredientId: "shallots", quantity: "200", unit: "g" },
          { kind: "ingredient", ingredientId: "celery", quantity: "150", unit: "g" },
          { kind: "ingredient", ingredientId: "white-wine", quantity: "250", unit: "ml" },
          { kind: "ingredient", ingredientId: "thyme", quantity: "1", unit: "pcs" },
          { kind: "ingredient", ingredientId: "butter", quantity: "40", unit: "g" },
        ],
      },
      {
        id: "beurre-blanc", name: "Lemon beurre blanc", kind: "sub_recipe", outletId: null, version: 2, approval: "approved",
        portions: "10", yield: { quantity: "0.6", unit: "l" }, updated: "2026-09-12",
        method: "Reduce wine and shallot, add cream, mount with cold butter, finish with lemon.",
        allergens: ["Milk", "Sulphites"],
        lines: [
          { kind: "ingredient", ingredientId: "butter", quantity: "400", unit: "g" },
          { kind: "ingredient", ingredientId: "shallots", quantity: "60", unit: "g" },
          { kind: "ingredient", ingredientId: "white-wine", quantity: "200", unit: "ml" },
          { kind: "ingredient", ingredientId: "cream", quantity: "100", unit: "ml" },
          { kind: "ingredient", ingredientId: "lemons", quantity: "1", unit: "pcs" },
        ],
      },
      {
        id: "pickled-shallots", name: "Pickled shallots", kind: "sub_recipe", outletId: null, version: 1, approval: "approved",
        portions: "20", yield: { quantity: "0.5", unit: "kg" }, updated: "2026-08-21",
        method: "Slice thinly, pour over hot pickling liquor, rest 24 h.",
        allergens: ["Sulphites"],
        lines: [
          { kind: "ingredient", ingredientId: "shallots", quantity: "400", unit: "g" },
          { kind: "ingredient", ingredientId: "vinegar", quantity: "200", unit: "ml" },
          { kind: "ingredient", ingredientId: "sugar", quantity: "60", unit: "g" },
        ],
      },
      {
        id: "chicken", name: "Roast chicken supreme, jus, charred fennel", kind: "dish", outletId: "out-dining", version: 6, approval: "approved",
        portions: "1", yield: null, updated: "2026-10-08",
        method: "Season and roast skin-side down, baste with butter and thyme, rest 5 min. Char fennel wedges; finish with jus.",
        allergens: ["Celery", "Milk", "Sulphites"],
        lines: [
          { kind: "ingredient", ingredientId: "chicken-supreme", quantity: "210", unit: "g" },
          { kind: "ingredient", ingredientId: "fennel", quantity: "150", unit: "g" },
          { kind: "ingredient", ingredientId: "butter", quantity: "15", unit: "g" },
          { kind: "ingredient", ingredientId: "thyme", quantity: "0.2", unit: "pcs" },
          { kind: "recipe", recipeId: "jus", quantity: "80", unit: "ml" },
          { kind: "ingredient", ingredientId: "microgreens", quantity: "5", unit: "g" },
        ],
      },
      {
        id: "sea-bass-dish", name: "Sea bass, beurre blanc, pickled shallot", kind: "dish", outletId: "out-dining", version: 3, approval: "approved",
        portions: "1", yield: null, updated: "2026-10-09",
        method: "Pan-fry skin-side down until crisp, turn for 30 s. Sauce, garnish with pickled shallot.",
        allergens: ["Fish", "Milk", "Sulphites"],
        lines: [
          { kind: "ingredient", ingredientId: "sea-bass", quantity: "170", unit: "g" },
          { kind: "recipe", recipeId: "beurre-blanc", quantity: "60", unit: "ml" },
          { kind: "recipe", recipeId: "pickled-shallots", quantity: "25", unit: "g" },
          { kind: "ingredient", ingredientId: "lemons", quantity: "0.25", unit: "pcs" },
          { kind: "ingredient", ingredientId: "olive-oil", quantity: "10", unit: "ml" },
        ],
      },
      {
        id: "risotto", name: "Wild mushroom risotto", kind: "dish", outletId: "out-dining", version: 2, approval: "draft",
        portions: "4", yield: null, updated: "2026-10-11",
        method: "Toast rice, deglaze, add stock in stages. Fold through roasted mushrooms, butter and parmesan.",
        allergens: ["Milk", "Sulphites"],
        lines: [
          { kind: "ingredient", ingredientId: "arborio", quantity: "320", unit: "g" },
          { kind: "ingredient", ingredientId: "mushrooms", quantity: "400", unit: "g" },
          { kind: "ingredient", ingredientId: "shallots", quantity: "80", unit: "g" },
          { kind: "ingredient", ingredientId: "white-wine", quantity: "150", unit: "ml" },
          { kind: "ingredient", ingredientId: "butter", quantity: "60", unit: "g" },
          { kind: "ingredient", ingredientId: "parmesan", quantity: "60", unit: "g" },
          { kind: "ingredient", ingredientId: "saffron", quantity: "0.2", unit: "g" },
        ],
      },
      {
        id: "chocolate-pot", name: "Dark chocolate pot, vanilla cream", kind: "dish", outletId: "out-dining", version: 5, approval: "approved",
        portions: "6", yield: null, updated: "2026-09-18",
        method: "Make a crème anglaise, pour over chocolate, set in pots. Serve with vanilla cream and salt.",
        allergens: ["Eggs", "Milk", "Soya"],
        lines: [
          { kind: "ingredient", ingredientId: "chocolate", quantity: "300", unit: "g" },
          { kind: "ingredient", ingredientId: "cream", quantity: "400", unit: "ml" },
          { kind: "ingredient", ingredientId: "eggs", quantity: "4", unit: "pcs" },
          { kind: "ingredient", ingredientId: "sugar", quantity: "60", unit: "g" },
          { kind: "ingredient", ingredientId: "vanilla", quantity: "1", unit: "pcs" },
          { kind: "ingredient", ingredientId: "sea-salt", quantity: "2", unit: "g" },
        ],
      },
      {
        id: "crispy-fennel", name: "Crispy fennel, lemon salt", kind: "dish", outletId: "out-terrace", version: 1, approval: "approved",
        portions: "1", yield: null, updated: "2026-10-02",
        method: "Shave fennel, dust and fry until crisp. Season with lemon zest and salt.",
        allergens: [],
        lines: [
          { kind: "ingredient", ingredientId: "fennel", quantity: "120", unit: "g" },
          { kind: "ingredient", ingredientId: "lemons", quantity: "0.5", unit: "pcs" },
          { kind: "ingredient", ingredientId: "olive-oil", quantity: "30", unit: "ml" },
          { kind: "ingredient", ingredientId: "sea-salt", quantity: "1", unit: "g" },
        ],
      },
      {
        id: "canape-bass", name: "Sea bass crudo canapé (per 10)", kind: "dish", outletId: "out-events", version: 1, approval: "draft",
        portions: "10", yield: null, updated: "2026-10-10",
        method: "Slice bass thinly, dress with oil and lemon, top with pickled shallot and microgreens.",
        allergens: ["Fish", "Sulphites"],
        lines: [
          { kind: "ingredient", ingredientId: "sea-bass", quantity: "250", unit: "g" },
          { kind: "ingredient", ingredientId: "olive-oil", quantity: "20", unit: "ml" },
          { kind: "ingredient", ingredientId: "lemons", quantity: "1", unit: "pcs" },
          { kind: "recipe", recipeId: "pickled-shallots", quantity: "40", unit: "g" },
          { kind: "ingredient", ingredientId: "microgreens", quantity: "10", unit: "g" },
        ],
      },
    ],
    dishes: [
      { recipeId: "chicken", category: "Mains", menuPrice: "26.00", targetOverride: null, pricedBy: "portion" },
      { recipeId: "sea-bass-dish", category: "Mains", menuPrice: "24.50", targetOverride: null, pricedBy: "portion" },
      { recipeId: "risotto", category: "Mains", menuPrice: "19.50", targetOverride: null, pricedBy: "portion" },
      { recipeId: "chocolate-pot", category: "Desserts", menuPrice: "11.00", targetOverride: null, pricedBy: "portion" },
      { recipeId: "crispy-fennel", category: "Bar snacks", menuPrice: "8.50", targetOverride: null, pricedBy: "portion" },
      { recipeId: "canape-bass", category: "Starters", menuPrice: "3.20", targetOverride: "0.32", pricedBy: "portion" },
    ],
  },
  {
    id: "ws-cafe",
    name: "Lindenhof Café (client)",
    role: "Consultant · Editor",
    locale: "en-GB",
    outlets: [{ id: "out-cafe", name: "Café counter", type: "Café" }],
    policies: [
      {
        id: "lindenhof-costing", version: 1, validFrom: "2026-03-01", currency: "EUR", defaultQuantityBasis: "gross",
        inputTaxRecoverable: false, menuPriceEntry: "tax_inclusive", allowance: { mode: "none" }, rounding: { mode: "up", step: "0.1" },
      },
    ],
    menuTaxRate: { name: "Café items (demo rate)", rate: "0.07" },
    exchangeRates: [],
    categories: [{ name: "Bakery", target: "0.22" }],
    units: METRIC_UNITS,
    ingredients: [
      ing("c-flour", "Wheat flour T550", "Bakery", "Mill Brothers", "MB-55", "1", eur("19.00", "25", "kg", { taxRate: "0.07" }), "2026-09-01"),
      ing("c-butter", "Butter 82 %", "Dairy", "Alpine Dairy", "AD-82", "1", eur("10.80", "1", "kg", { taxRate: "0.07" }), "2026-09-01"),
      ing("c-sugar", "Sugar", "Bakery", "Mill Brothers", "MB-02", "1", eur("1.40", "1", "kg", { taxRate: "0.07" }), "2026-09-01"),
    ],
    recipes: [
      {
        id: "c-shortbread", name: "Butter shortbread (tray of 24)", kind: "dish", outletId: "out-cafe", version: 1, approval: "approved",
        portions: "24", yield: null, updated: "2026-09-03", method: "Cream, combine, roll, bake at 160 °C.", allergens: ["Gluten", "Milk"],
        lines: [
          { kind: "ingredient", ingredientId: "c-flour", quantity: "600", unit: "g" },
          { kind: "ingredient", ingredientId: "c-butter", quantity: "400", unit: "g" },
          { kind: "ingredient", ingredientId: "c-sugar", quantity: "200", unit: "g" },
        ],
      },
    ],
    dishes: [{ recipeId: "c-shortbread", category: "Bakery", menuPrice: "2.40", targetOverride: null, pricedBy: "portion" }],
  },
];
