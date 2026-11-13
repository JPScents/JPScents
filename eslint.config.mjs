import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    rules: {
      curly: ["error", "all"],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "import/newline-after-import": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "output/**",
    ".playwright-cli/**",
    "src/infrastructure/database/generated/**",
    "supabase/.temp/**",
    ".vercel/**",
    "**/.env*",
  ]),
]);

export default eslintConfig;
