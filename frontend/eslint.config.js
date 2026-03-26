import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import importX from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import globals from "globals";

const sharedRules = {
  // ----------------------------
  // Async Safety
  // ----------------------------

  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/await-thenable": "error",
  "@typescript-eslint/no-misused-promises": "error",

  "no-return-await": "off",
  "@typescript-eslint/return-await": ["error", "always"],

  // ----------------------------
  // Code Quality
  // ----------------------------

  "@typescript-eslint/no-explicit-any": "warn",

  "no-unused-vars": "off",
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      args: "after-used",
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    },
  ],

  "no-redeclare": "off",
  "@typescript-eslint/no-redeclare": "error",

  "no-debugger": "error",
  "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
  "eqeqeq": ["error", "always"],

  // ----------------------------
  // Import Safety
  // ----------------------------

  "import-x/no-unresolved": "error",

  // ----------------------------
  // Code Style
  // ----------------------------

  "indent": ["error", 2],
  "comma-dangle": ["error", "always-multiline"],
};

const sharedSettings = {
  "import-x/resolver-next": createTypeScriptImportResolver({
    alwaysTryTypes: true,
    project: "./tsconfig.app.json",
  }),
};

export default defineConfig([
  // --------------------------------------------------
  // Global ignores
  // --------------------------------------------------

  {
    ignores: ["dist/**", "node_modules/**", "public/**", "coverage/**"],
  },

  // --------------------------------------------------
  // Vue base rules (scoped to .vue only)
  // --------------------------------------------------

  ...pluginVue.configs["flat/recommended"].map((config) => ({
    ...config,
    files: ["**/*.vue"],
  })),

  // --------------------------------------------------
  // Source: TypeScript files
  // --------------------------------------------------

  {
    files: ["src/**/*.ts"],

    languageOptions: {
      globals: { ...globals.browser },
      parser: tseslint.parser,
      parserOptions: {
        sourceType: "module",
        project: "./tsconfig.app.json",
        tsconfigRootDir: process.cwd(),
      },
    },

    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "import-x": importX,
    },

    settings: sharedSettings,

    rules: {
      ...tseslint.configs.recommended.rules,
      ...sharedRules,
    },
  },

  // --------------------------------------------------
  // Source: Vue files
  // --------------------------------------------------

  {
    files: ["src/**/*.vue"],

    languageOptions: {
      globals: { ...globals.browser },
      parser: pluginVue.parser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        sourceType: "module",
        project: "./tsconfig.app.json",
        tsconfigRootDir: process.cwd(),
      },
    },

    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "import-x": importX,
      "vue": pluginVue,
    },

    settings: sharedSettings,

    rules: {
      ...tseslint.configs.recommended.rules,
      ...sharedRules,
      
      "vue/multi-word-component-names": "off",
      "vue/no-ref-object-reactivity-loss": "error",
      "vue/prefer-use-template-ref": "warn",
      "vue/block-order": ["warn", { order: ["template", "script", "style"] }],
      "vue/no-v-html": "warn",

      "vue/max-attributes-per-line": "off",
      "vue/multiline-html-element-content-newline": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
    },
  },

  // --------------------------------------------------
  // Tests (Vitest)
  // --------------------------------------------------

  {
    files: ["src/**/*.test.ts", "src/**/*.spec.ts", "test/**/*.ts"],

    languageOptions: {
      globals: { ...globals.browser },
      parser: tseslint.parser,
      parserOptions: {
        sourceType: "module",
        project: "./tsconfig.app.json",
        tsconfigRootDir: process.cwd(),
      },
    },

    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },

    rules: {
      ...tseslint.configs.recommended.rules,

      // Vitest describe/it callbacks are intentionally not awaited
      "@typescript-eslint/no-floating-promises": "off",

      // Mocks and stubs legitimately need any
      "@typescript-eslint/no-explicit-any": "off",

      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "error",

      "indent": ["error", 2],
      "comma-dangle": ["error", "always-multiline"],
    },
  },

  // --------------------------------------------------
  // Tooling (no type checking)
  // --------------------------------------------------

  {
    files: ["*.config.ts", "**/*.config.ts", "*.config.js", "**/*.config.js"],

    languageOptions: {
      parserOptions: {
        project: null,
      },
    },

    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/return-await": "off",
      "@typescript-eslint/no-redeclare": "off",
    },
  },
]);