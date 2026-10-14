/**
 * The Journal. Every entry below is a PLACEHOLDER: an outline of a planned
 * article, not published writing. To publish a real article, add an entry with
 * status "published" and a `body`; the pages need no other change.
 */
export const JOURNAL_CATEGORIES = [
  { id: "techniques", name: "Culinary Techniques" },
  { id: "management", name: "Kitchen Management" },
  { id: "food-cost", name: "Food Cost & Profitability" },
  { id: "leadership", name: "Leadership & Team Building" },
  { id: "pre-opening", name: "Hotel Pre-Opening" },
  { id: "career", name: "Chef Career" },
] as const;

export type JournalCategoryId = (typeof JOURNAL_CATEGORIES)[number]["id"];

export type JournalArticle = {
  slug: string;
  category: JournalCategoryId;
  title: string;
  dek: string;
  readingMinutes: number | null;
  status: "placeholder" | "published";
  /** For placeholders: what the article will cover. */
  outline?: string[];
  /** For published articles: paragraphs. */
  body?: string[];
  publishedOn?: string;
};

export const JOURNAL_ARTICLES: JournalArticle[] = [
  {
    slug: "yield-testing-at-the-butchery-bench", category: "techniques", status: "placeholder", readingMinutes: null,
    title: "Yield testing at the butchery bench",
    dek: "Why the yield on your costing sheet should come from your own knife work, not a supplier chart.",
    outline: ["Setting up a repeatable yield test", "Trim, bone and cooking loss: measuring them separately", "When to re-test, and how to record it"],
  },
  {
    slug: "holding-sauces-through-a-long-service", category: "techniques", status: "placeholder", readingMinutes: null,
    title: "Holding emulsified sauces through a long service",
    dek: "Temperature, timing and back-up plans for beurre blanc and hollandaise on a busy pass.",
    outline: ["Safe holding temperatures", "Rescue techniques for split sauces", "Batch sizing for covers"],
  },
  {
    slug: "the-first-ten-minutes-of-service", category: "management", status: "placeholder", readingMinutes: null,
    title: "The first ten minutes of service",
    dek: "A checklist culture that keeps the pass calm when the first tickets land.",
    outline: ["Line checks that matter", "Communication on the pass", "What to review after service"],
  },
  {
    slug: "menu-price-from-the-net-price", category: "food-cost", status: "placeholder", readingMinutes: null,
    title: "Price from the net, not the menu",
    dek: "Food cost is measured against the price without tax. Getting that wrong flatters every dish.",
    outline: ["Net and gross prices", "Worked example with a fictional dish", "Rounding rules that never undershoot the target"],
  },
  {
    slug: "when-a-supplier-raises-a-price", category: "food-cost", status: "placeholder", readingMinutes: null,
    title: "When a supplier raises a price",
    dek: "Tracing one price change through sub-recipes to every dish on the menu.",
    outline: ["Finding every affected recipe", "Deciding between re-pricing and re-specifying", "Keeping a price history"],
  },
  {
    slug: "building-a-brigade-from-zero", category: "leadership", status: "placeholder", readingMinutes: null,
    title: "Building a brigade from zero",
    dek: "Hiring, onboarding and setting standards before the kitchen has served a single plate.",
    outline: ["Defining roles before hiring", "Training plans for an untested team", "Setting the tone in week one"],
  },
  {
    slug: "pre-opening-the-last-90-days", category: "pre-opening", status: "placeholder", readingMinutes: null,
    title: "Pre-opening: the last 90 days",
    dek: "Equipment, suppliers, SOPs, trials and the order in which they really have to happen.",
    outline: ["Critical path for a hotel kitchen", "Supplier onboarding and trial orders", "Soft opening and what to measure"],
  },
  {
    slug: "from-sous-chef-to-executive-chef", category: "career", status: "placeholder", readingMinutes: null,
    title: "From sous chef to executive chef",
    dek: "The skills that change when the job moves from the stove to the whole operation.",
    outline: ["Budgets, people, guests: the new triangle", "Working with general managers and owners", "Keeping your hands in the food"],
  },
];
