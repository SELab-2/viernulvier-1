import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import nodePlugin from "eslint-plugin-n";
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
      "scripts/**",
      "migrations/**"
    ]
  },

  // --------------------------------------------------
  // Base JS + Node Security Rules
  // --------------------------------------------------

  tseslint.configs.recommended,
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
        project: "./tsconfig.eslint.json",
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
      "no-unused-vars": "off",

      "@typescript-eslint/no-redeclare": "error",

      "no-redeclare": "off",
      "no-unused-vars": "off",

      // ----------------------------
      // Security / Node Runtime Safety
      // ----------------------------

      "n/no-process-exit": "error",
      "n/handle-callback-err": "error",

      // Prevent common API logic mistakes
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-deprecated": "error",

      // Rely on the beter import resolver
      "n/no-missing-import": "off",
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

  // Legacy CSV import modules: fs paths are argv-driven (trusted CLI); rule is noise here.
  {
    files: ["src/legacy-import/**/*.ts"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
    },
  },

  // Scraper: narrow suppressions to modules that need dynamic keys or non-literal report paths.
  {
    files: ["src/scraper/scrape-stats.ts"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-object-injection": "off",
    },
  },
  {
    files: ["src/scraper/language-map.ts"],
    rules: {
      "security/detect-object-injection": "off",
    },
  },
  {
    files: ["src/scraper/event.ts", "src/scraper/production-tags.ts"],
    rules: {
      "security/detect-object-injection": "off",
    },
  },

  // --------------------------------------------------
  // Tests (Vitest / Jest style)
  // --------------------------------------------------

  {
    files: ["test/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],

    plugins: {
      "import-x": importX,
    },

    settings: {
      "import-x/resolver-next": createTypeScriptImportResolver({
        alwaysTryTypes: true,
        project: './tsconfig.json'
      })
    },

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: process.cwd()
      }
    },

    rules: {
      "n/no-unpublished-import": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-deprecated": "error",

      // Tests use temp paths and fixtures; non-literal fs paths are intentional.
      "security/detect-non-literal-fs-filename": "off",

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],

      "indent": ["error", 2],
      "comma-dangle": ["error", "always-multiline"],
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
]);
