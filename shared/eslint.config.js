import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import prettierConfig from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import tsdoc from 'eslint-plugin-tsdoc'

export default defineConfig([
  // --------------------------------------------------
  // Global ignores
  // --------------------------------------------------

  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "eslint.config.js",
    ]
  },

  // --------------------------------------------------
  // Base JS + Security Rules
  // --------------------------------------------------

  js.configs.recommended,
  security.configs.recommended,

  // --------------------------------------------------
  // SOURCE CODE (Type Safe Zone)
  // --------------------------------------------------

  {
    files: ["src/**/*.ts"],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd()
      }
    },

    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "import-x": importX,
      "tsdoc": tsdoc
    },

    settings: {
      "import-x/resolver-next": createTypeScriptImportResolver({
        alwaysTryTypes: true,
        project: './tsconfig.json'
      })
    },

    rules: {
      // ----------------------------
      // Code Quality
      // ----------------------------

      "@typescript-eslint/no-explicit-any": "warn",

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],

      // ----------------------------
      // Async Safety
      // ----------------------------

      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      "no-return-await": "off",
      "@typescript-eslint/return-await": ["error", "always"],

      "@typescript-eslint/no-misused-promises": "error",

      // ----------------------------
      // Imports
      // ----------------------------

      "import-x/no-unresolved": "error",

      // ----------------------------
      // Docs
      // ----------------------------

      "tsdoc/syntax": "warn"
    }
  },

  // --------------------------------------------------
  // Tests (Vitest / Jest style)
  // --------------------------------------------------

  {
    files: ["test/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd()
      }
    },

    rules: {
      "@typescript-eslint/no-floating-promises": "off"
    }
  },

  // --------------------------------------------------
  // Runtime JS Files
  // --------------------------------------------------

  {
    files: ["**/*.js", "**/*.mjs"],

    ...tseslint.configs.disableTypeChecked
  },

  // --------------------------------------------------
  // Prettier must always be last
  // --------------------------------------------------

  prettierConfig
]);