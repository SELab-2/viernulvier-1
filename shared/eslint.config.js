import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
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
  // Base JS + Node Security Rules
  // --------------------------------------------------

  tseslint.configs.recommended,
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

      "@typescript-eslint/no-redeclare": "error",

      "no-redeclare": "off",
      "no-unused-vars": "off",

      // ----------------------------
      // Security / Node Runtime Safety
      // ----------------------------

      // Prevent common API logic mistakes
      "@typescript-eslint/no-misused-promises": "error",

      // Rely on the beter import resolver
      "import-x/no-unresolved": "error",

      // tsdoc config
      "tsdoc/syntax": "warn",

      // ----------------------------
      // Code Style
      // ----------------------------

      "indent": ["error", 2],
      "comma-dangle": ["error", "always-multiline"],
    }
  },

  // --------------------------------------------------
  // Runtime JS Files
  // --------------------------------------------------

  {
    files: ["**/*.js", "**/*.mjs"],

    ...tseslint.configs.disableTypeChecked
  },
]);