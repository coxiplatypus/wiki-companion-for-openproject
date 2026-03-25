// Overview: Central ESLint config for TypeScript/JavaScript in this extension repository.
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["dist/**", "artifacts/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts}"],
    rules: {
      "no-undef": "off"
    }
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
