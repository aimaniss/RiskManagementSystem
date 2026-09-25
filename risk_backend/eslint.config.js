import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "migrations/sql/**"] },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Pembolehubah tidak digunakan: amaran sahaja (kod sedia ada), `_` diabaikan
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
];
