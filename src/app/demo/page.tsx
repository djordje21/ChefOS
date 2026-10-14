import { redirect } from "next/navigation";

/** The interface demo now lives at /food-cost (and /recipes); keep old links working. */
export default function DemoPage() {
  redirect("/food-cost");
}
