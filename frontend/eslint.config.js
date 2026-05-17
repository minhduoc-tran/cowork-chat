import js from "@eslint/js"
import boundaries from "eslint-plugin-boundaries"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import unusedImports from "eslint-plugin-unused-imports"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

const importSortGroups = [
  ["^\\u0000"],
  ["^node:"],
  ["^react$", "^react-dom$", "^@?\\w"],
  ["^@/app(?:/.*)?$"],
  ["^@/features(?:/.*)?$"],
  ["^@/shared(?:/.*)?$", "^@/index\\.css$"],
  ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
  ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
]

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      boundaries,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    settings: {
      "boundaries/elements": [
        {
          type: "app",
          pattern: "src/app",
        },
        {
          type: "feature",
          pattern: "src/features/*",
          capture: ["featureName"],
        },
        {
          type: "shared",
          pattern: "src/shared",
        },
      ],
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: { type: "app" },
              allow: {
                to: {
                  type: ["app", "feature", "shared"],
                },
              },
            },
            {
              from: { type: "feature" },
              allow: {
                to: {
                  type: "shared",
                },
              },
            },
            {
              from: { type: "shared" },
              allow: {
                to: {
                  type: "shared",
                },
              },
            },
          ],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/**"],
              message:
                "Import features through their public index export only.",
            },
          ],
        },
      ],
      "simple-import-sort/imports": [
        "error",
        {
          groups: importSortGroups,
        },
      ],
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
