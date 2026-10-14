export type DestinationId = "recipes" | "food-cost" | "journal" | "news" | "pre-opening";

export type Destination = {
  id: DestinationId;
  order: string; // printed on the kitchen ticket
  title: string;
  line: string;
  href: string;
  status: "demo" | "placeholder" | "directory" | "intro";
  statusLabel: string;
  /** Visual identity: ink colour for the ticket stamp and the destination header. */
  ink: string;
  paper: string;
};

export const DESTINATIONS: Destination[] = [
  {
    id: "recipes", order: "01", title: "The Recipe Book", line: "Recipes, sub-recipes, methods and allergens.",
    href: "/recipes", status: "demo", statusLabel: "Public demo · fictional data", ink: "#7a3f22", paper: "#f3ebdf",
  },
  {
    id: "food-cost", order: "02", title: "Food Cost", line: "Cost every gram. Price every plate.",
    href: "/food-cost", status: "demo", statusLabel: "Public demo · live calculations", ink: "#1f5c43", paper: "#eef1ec",
  },
  {
    id: "journal", order: "03", title: "The Journal", line: "Technique, leadership and the business of the kitchen.",
    href: "/journal", status: "placeholder", statusLabel: "Articles coming soon", ink: "#23365c", paper: "#eef0f5",
  },
  {
    id: "news", order: "04", title: "Industry News", line: "Hand-picked hospitality and foodservice publications.",
    href: "/news", status: "directory", statusLabel: "Curated directory", ink: "#8c2a24", paper: "#f2eeea",
  },
  {
    id: "pre-opening", order: "05", title: "Pre-Opening", line: "From blueprint to first service.",
    href: "/pre-opening", status: "intro", statusLabel: "Introduction · demo board", ink: "#1d5674", paper: "#e9f1f5",
  },
];

export const CHEF_LINE = "Good morning, Chef. What are we working on today?";

/** Remembered for a year so returning visitors land straight on the menu. Contains no personal data. */
export const INTRO_COOKIE = "chefos_intro";
