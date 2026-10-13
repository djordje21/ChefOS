/**
 * Standalone entry for the hosted interface preview (claude.ai artifact).
 * Same components as /demo in the Next app; fictional data; no network calls.
 */
import { createRoot } from "react-dom/client";
import { DemoApp } from "@/demo/DemoApp";

createRoot(document.getElementById("root")!).render(<DemoApp />);
