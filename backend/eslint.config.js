import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import nodePlugin from "eslint-plugin-n";
import prettierConfig from "eslint-config-prettier";

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
      "scripts/**",
      "migrations/**"
    ]
  },

  // --------------------------------------------------
  // Base JS + Node Security Rules
  // --------------------------------------------------

  js.configs.recommended,
  security.configs.recommended,
  nodePlugin.configs["flat/recommended"],

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

    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json"
        }
      }
    },

    plugins: {
      "@typescript-eslint": tseslint.plugin
    },

    rules: {
      // ----------------------------
      // Async Backend Safety
      // ----------------------------

      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      "no-return-await": "off",
      "@typescript-eslint/return-await": ["error", "always"],

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
      // Security / Node Runtime Safety
      // ----------------------------

      "n/no-process-exit": "error",
      "n/handle-callback-err": "error",

      // Prevent common API logic mistakes
      "@typescript-eslint/no-misused-promises": "error",

      // Rely on the beter import resolver
      "n/no-missing-import": "off",
      "import/no-unresolved": "error"
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
      "n/no-unpublished-import": "off",
      "@typescript-eslint/no-floating-promises": "off"
    }
  },

  // --------------------------------------------------
  // Tooling + Scripts (NO TYPE CHECKING)
  // --------------------------------------------------

  {
    files: ["scripts/**/*.ts", "*.config.ts", "**/*.config.ts"],

    ...tseslint.configs.disableTypeChecked
  },

  // --------------------------------------------------
  // Runtime JS Files
  // --------------------------------------------------

  {
    files: ["**/*.js", "**/*.mjs"],

    ...tseslint.configs.disableTypeChecked
  },

  // --------------------------------------------------
  // Fix Vitest Config complaints
  // --------------------------------------------------

  {
    files: ["vitest.config.ts", "**/*.config.ts"],

    languageOptions: {
      parserOptions: {
        sourceType: "module"
      }
    },

    rules: {
      "n/no-unpublished-import": "off",
      "no-undef": "off"
    }
  },

  // --------------------------------------------------
  // Prettier must always be last
  // --------------------------------------------------

  prettierConfig
]);