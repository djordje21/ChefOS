export type DestinationId = "recipes" | "food-cost" | "journal" | "news" | "pre-opening";

export type Destination = {
  id: DestinationId;
  number: string;
  title: string;
  line: string;
  href: string;
  /** Honest, short state of the destination today (shown next to it on the landing). */
  statusLabel: string;
  /** Accent colour of the destination's page header. */
  ink: string;
};

export const DESTINATIONS: Destination[] = [
  { id: "recipes", number: "01", title: "The Recipe Book", line: "Recipes, techniques, and culinary development.", href: "/recipes", statusLabel: "Demo", ink: "#7a3f22" },
  { id: "food-cost", number: "02", title: "Food Cost", line: "Recipe costing, margins, and profitability.", href: "/food-cost", statusLabel: "Demo", ink: "#1f5c43" },
  { id: "journal", number: "03", title: "The Journal", line: "Culinary knowledge, leadership, and kitchen management.", href: "/journal", statusLabel: "Coming soon", ink: "#23365c" },
  { id: "news", number: "04", title: "Industry News", line: "Relevant hospitality and culinary industry publications.", href: "/news", statusLabel: "Directory", ink: "#8c2a24" },
  { id: "pre-opening", number: "05", title: "Pre-Opening", line: "Hotel kitchen planning, setup, and operational readiness.", href: "/pre-opening", statusLabel: "Preview", ink: "#1d5674" },
];
