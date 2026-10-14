import { DemoApp } from "@/demo/DemoApp";

export const metadata = { title: "Food Cost (demo)" };

/** Public, frontend-only demo: fictional data, real costing engine in the browser. No Supabase calls; nothing is saved. */
export default function FoodCostPage() {
  return <DemoApp initialScreen="recipes" />;
}
