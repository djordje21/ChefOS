import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "tools/**", "playwright-report/**", "test-results/**", "src/lib/supabase/database.types.ts"] },
];

export default config;
