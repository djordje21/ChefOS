/**
 * Pre-Opening demo board. ENTIRELY FICTIONAL: the hotel, dates, roles and
 * tasks are invented to show how the module will work. Real project management
 * will live behind sign-in, in your workspace.
 */
export const DEMO_PROJECT = {
  name: "Riverside Meridian Hotel (fictional)",
  openingDate: "2027-03-01",
  today: "2026-11-01",
};

export const WORKSTREAMS = [
  "Kitchen design & workflow",
  "Equipment & procurement",
  "Kitchen OS&E",
  "Menu development",
  "Recipe costing",
  "Supplier onboarding",
  "Recruitment & staffing",
  "Training",
  "SOPs",
  "Food safety readiness",
  "Operational testing",
  "Opening readiness",
] as const;

export type DemoTask = {
  id: string;
  workstream: (typeof WORKSTREAMS)[number];
  title: string;
  owner: string;
  due: string;
  priority: "high" | "medium" | "low";
  done: boolean;
  dependsOn: string[];
};

export const DEMO_TASKS: DemoTask[] = [
  { id: "t1", workstream: "Kitchen design & workflow", title: "Sign off main kitchen layout with architect", owner: "Executive Chef", due: "2026-11-10", priority: "high", done: true, dependsOn: [] },
  { id: "t2", workstream: "Equipment & procurement", title: "Approve cooking line specification", owner: "Executive Chef", due: "2026-11-20", priority: "high", done: true, dependsOn: ["t1"] },
  { id: "t3", workstream: "Equipment & procurement", title: "Place order for combi ovens and blast chillers", owner: "Purchasing Manager", due: "2026-12-01", priority: "high", done: false, dependsOn: ["t2"] },
  { id: "t4", workstream: "Kitchen OS&E", title: "Finalise smallwares and crockery list", owner: "Executive Sous Chef", due: "2026-12-15", priority: "medium", done: false, dependsOn: ["t1"] },
  { id: "t5", workstream: "Menu development", title: "First draft of restaurant and room-service menus", owner: "Executive Chef", due: "2026-12-05", priority: "high", done: true, dependsOn: [] },
  { id: "t6", workstream: "Recipe costing", title: "Cost all menu dishes against targets", owner: "Executive Chef", due: "2026-12-20", priority: "high", done: false, dependsOn: ["t5", "t8"] },
  { id: "t7", workstream: "Supplier onboarding", title: "Shortlist produce, meat and fish suppliers", owner: "Purchasing Manager", due: "2026-11-25", priority: "medium", done: true, dependsOn: [] },
  { id: "t8", workstream: "Supplier onboarding", title: "Agree trial price lists", owner: "Purchasing Manager", due: "2026-12-10", priority: "high", done: false, dependsOn: ["t7"] },
  { id: "t9", workstream: "Recruitment & staffing", title: "Hire sous chefs and chefs de partie", owner: "Executive Chef · HR", due: "2027-01-10", priority: "high", done: false, dependsOn: [] },
  { id: "t10", workstream: "Training", title: "Two-week kitchen training plan", owner: "Executive Sous Chef", due: "2027-01-25", priority: "medium", done: false, dependsOn: ["t9", "t12"] },
  { id: "t11", workstream: "SOPs", title: "Receiving and storage SOPs", owner: "Executive Sous Chef", due: "2027-01-05", priority: "medium", done: false, dependsOn: [] },
  { id: "t12", workstream: "SOPs", title: "Station set-up and closing SOPs", owner: "Chef de Cuisine", due: "2027-01-15", priority: "medium", done: false, dependsOn: ["t11"] },
  { id: "t13", workstream: "Food safety readiness", title: "HACCP plan and temperature logs in place", owner: "Executive Chef", due: "2027-02-01", priority: "high", done: false, dependsOn: ["t11"] },
  { id: "t14", workstream: "Operational testing", title: "Equipment commissioning and test cooks", owner: "Chef de Cuisine", due: "2027-02-10", priority: "high", done: false, dependsOn: ["t3"] },
  { id: "t15", workstream: "Operational testing", title: "Friends-and-family dinners (3 nights)", owner: "Executive Chef", due: "2027-02-20", priority: "medium", done: false, dependsOn: ["t10", "t14", "t6"] },
  { id: "t16", workstream: "Opening readiness", title: "Opening readiness review with GM", owner: "Executive Chef · GM", due: "2027-02-25", priority: "high", done: false, dependsOn: ["t13", "t15"] },
];
