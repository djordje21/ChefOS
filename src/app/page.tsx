import type { Metadata } from "next";
import { Landing } from "@/experience/Landing";

export const metadata: Metadata = {
  title: { absolute: "ChefOS · Your kitchen. Your craft. Your command." },
  description: "A professional workspace for recipes, food cost, kitchen operations, and culinary development.",
};

export default function Home() {
  return <Landing />;
}
