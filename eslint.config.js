import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

// LIJAN™ — lint scope.
//
// Scope is every front-end source file the project owns: pages, components, internal
// library, hooks, utilities, plus the shared UI primitives (vendored copies from the
// UI kit, reported separately below). Generated output, third-party packages and build
// artifacts are excluded.
//
//   Project code:      npx eslint src --ignore-pattern "src/components/ui/**"
//   Shared UI kit:     npx eslint src/components/ui
//
// This configuration is JavaScript/JSX only — a TypeScript file parsed by it fails as a
// syntax error, so .ts/.tsx are deliberately out of scope. Backend functions and shared
// modules (.ts) run on the Deno runtime and are checked separately, by type-checking and
// by executing them.
const projectFiles = [
  "src/**/*.{js,mjs,cjs,jsx}",
];

const sharedConfig = (files) => ({
  files,
  ignores: [
    "dist/**",
    "node_modules/**",
    "public/**",
    "src/components/ui/**/*.d.ts",
  ],
  ...pluginJs.configs.recommended,
  ...pluginReact.configs.flat.recommended,
  languageOptions: {
    globals: globals.browser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  plugins: {
    react: pluginReact,
    "react-hooks": pluginReactHooks,
    "unused-imports": pluginUnusedImports,
  },
  rules: {
    "no-unused-vars": "off",
    "react/jsx-uses-vars": "error",
    "react/jsx-uses-react": "error",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "react/no-unknown-property": [
      "error",
      { ignore: ["cmdk-input-wrapper", "toast-close"] },
    ],
    "react-hooks/rules-of-hooks": "error",
  },
});

export default [
  sharedConfig(projectFiles),
];