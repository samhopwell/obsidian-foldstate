import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  { ignores: ["node_modules/**", "main.js"] },
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: { project: "./tsconfig.json" },
    },
    rules: {
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
]);
