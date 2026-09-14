import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // §23: config/env.js is the only module allowed to read process.env.
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Read configuration from config/env.js — it is the only module that may touch process.env (ARCHITECTURE §23).",
        },
      ],
      eqeqeq: ["error", "smart"],
      "no-console": "warn",
    },
  },
  {
    // CLI scripts report to a terminal; process.env stays forbidden there too.
    files: ["scripts/**/*.js"],
    rules: { "no-console": "off" },
  },
  {
    // env.js is the one place process.env is read; tests set it deliberately.
    files: ["src/config/env.js", "tests/**/*.js", "vitest.config.js"],
    rules: { "no-restricted-properties": "off", "no-console": "off" },
  },
];
