"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import { costingPolicySchema, parse } from "@/lib/costing/schema";
import { DEMO_WORKSPACES, type DemoIngredient, type DemoLine, type DemoWorkspace } from "./data";
import { DEMO_TODAY, evaluate, type Evaluation } from "./model";

/** In-memory only. Nothing is sent anywhere or saved; reloading the page resets the demo. */

export type Screen = "dashboard" | "recipes" | "ingredients" | "settings" | "about";

type State = {
  workspaces: DemoWorkspace[];
  workspaceId: string;
  outletId: string; // "all" or an outlet id
  screen: Screen;
  recipeId: string | null;
  ingredientId: string | null;
  notice: string | null;
};

type Action =
  | { type: "workspace"; id: string }
  | { type: "outlet"; id: string }
  | { type: "go"; screen: Screen; recipeId?: string | null; ingredientId?: string | null }
  | { type: "line"; recipeId: string; index: number; patch: Partial<DemoLine> }
  | { type: "removeLine"; recipeId: string; index: number }
  | { type: "addLine"; recipeId: string; line: DemoLine }
  | { type: "portions"; recipeId: string; portions: string }
  | { type: "dish"; recipeId: string; patch: { menuPrice?: string; targetOverride?: string | null } }
  | { type: "ingredient"; id: string; patch: Partial<DemoIngredient> }
  | { type: "policy"; policy: unknown }
  | { type: "categoryTarget"; name: string; target: string }
  | { type: "menuTax"; rate: string }
  | { type: "notice"; text: string | null }
  | { type: "reset" };

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function initial(): State {
  return {
    workspaces: clone(DEMO_WORKSPACES),
    workspaceId: DEMO_WORKSPACES[0]!.id,
    outletId: "all",
    screen: "recipes",
    recipeId: "chicken",
    ingredientId: null,
    notice: null,
  };
}

function updateWs(state: State, fn: (ws: DemoWorkspace) => DemoWorkspace): State {
  return { ...state, workspaces: state.workspaces.map((w) => (w.id === state.workspaceId ? fn(w) : w)) };
}

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case "workspace": {
      const ws = state.workspaces.find((w) => w.id === a.id)!;
      const first = ws.recipes.find((r) => r.kind === "dish");
      return { ...state, workspaceId: a.id, outletId: "all", recipeId: first?.id ?? null, ingredientId: null, notice: `Switched to ${ws.name}. Its data is completely separate.` };
    }
    case "outlet":
      return { ...state, outletId: a.id };
    case "go":
      return { ...state, screen: a.screen, recipeId: a.recipeId ?? state.recipeId, ingredientId: a.ingredientId ?? null };
    case "line":
      return updateWs(state, (ws) => ({
        ...ws,
        recipes: ws.recipes.map((r) =>
          r.id === a.recipeId ? { ...r, approval: "draft", lines: r.lines.map((l, i) => (i === a.index ? ({ ...l, ...a.patch } as DemoLine) : l)) } : r,
        ),
      }));
    case "removeLine":
      return updateWs(state, (ws) => ({
        ...ws,
        recipes: ws.recipes.map((r) => (r.id === a.recipeId ? { ...r, approval: "draft", lines: r.lines.filter((_, i) => i !== a.index) } : r)),
      }));
    case "addLine":
      return updateWs(state, (ws) => ({
        ...ws,
        recipes: ws.recipes.map((r) => (r.id === a.recipeId ? { ...r, approval: "draft", lines: [...r.lines, a.line] } : r)),
      }));
    case "portions":
      return updateWs(state, (ws) => ({
        ...ws,
        recipes: ws.recipes.map((r) => (r.id === a.recipeId ? { ...r, approval: "draft", portions: a.portions } : r)),
      }));
    case "dish":
      return updateWs(state, (ws) => ({ ...ws, dishes: ws.dishes.map((d) => (d.recipeId === a.recipeId ? { ...d, ...a.patch } : d)) }));
    case "ingredient":
      return updateWs(state, (ws) => ({
        ...ws,
        ingredients: ws.ingredients.map((i) => {
          if (i.id !== a.id) return i;
          const priceChanged = a.patch.price && i.price && a.patch.price.amount !== i.price.amount;
          return {
            ...i,
            ...a.patch,
            ...(priceChanged ? { previousPrice: { amount: i.price!.amount, date: i.priceUpdated ?? DEMO_TODAY }, priceUpdated: DEMO_TODAY } : {}),
            ...(a.patch.price && !i.price ? { priceUpdated: DEMO_TODAY } : {}),
          };
        }),
      }));
    case "policy": {
      const p = parse(costingPolicySchema, a.policy, "policy");
      return {
        ...updateWs(state, (ws) => ({ ...ws, policies: [...ws.policies, a.policy as DemoWorkspace["policies"][number]] })),
        notice: `Costing rules version ${p.version} saved (demo only). All recipes were recalculated.`,
      };
    }
    case "categoryTarget":
      return updateWs(state, (ws) => ({ ...ws, categories: ws.categories.map((c) => (c.name === a.name ? { ...c, target: a.target } : c)) }));
    case "menuTax":
      return updateWs(state, (ws) => ({ ...ws, menuTaxRate: { ...ws.menuTaxRate, rate: a.rate } }));
    case "notice":
      return { ...state, notice: a.text };
    case "reset":
      return { ...initial(), notice: "Demo data reset." };
  }
}

type Ctx = {
  state: State;
  dispatch: (a: Action) => void;
  ws: DemoWorkspace;
  evaluation: Evaluation;
};

const DemoContext = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const ws = state.workspaces.find((w) => w.id === state.workspaceId)!;
  const evaluation = useMemo(() => evaluate(ws), [ws]);
  return <DemoContext.Provider value={{ state, dispatch, ws, evaluation }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo outside DemoProvider");
  return ctx;
}
