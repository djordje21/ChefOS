import { DemoApp } from "@/demo/DemoApp";

export const metadata = { title: "Recipe Book (demo)" };

/** Public, frontend-only demo with fictional recipes. No Supabase calls; nothing is saved. */
export default function RecipesPage() {
  return <DemoApp initialScreen="book" />;
}
