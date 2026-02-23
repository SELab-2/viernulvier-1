import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tsdoc from 'eslint-plugin-tsdoc'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },

  {
    plugins: {
      "tsdoc": tsdoc
    },

    rules: {
      // --- MEDIUM STRICTNESS / FLEXIBILITY ---
      'vue/multi-word-component-names': 'off', // Flexible: use 'Home.vue' or 'HomeView.vue'
      '@typescript-eslint/no-explicit-any': 'warn', // Warn: avoid 'any' but don't block build
      'no-unused-vars': 'off', // Handle via TS rule
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],

      // --- MODERN VUE 3.5+ BEST PRACTICES (WARNS) ---
      'vue/prefer-use-template-ref': 'warn', // Warn: use the new useTemplateRef()
      'vue/no-ref-object-reactivity-loss': 'error', // Error: this catches actual logic bugs
      'vue/block-order': ['warn', { order: ['template', 'script', 'style'] }],

      // --- POORLY WRITTEN CODE PREVENTION ---
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': 'error',
      eqeqeq: ['error', 'always'], // Prevent '==' vs '===' bugs
      'vue/no-v-html': 'warn', // XSS safety best practice

      // tsdoc config
      "tsdoc/syntax": "warn",

      // --- FORMATTING ---
      'prettier/prettier': [
        'warn',
        {
          singleQuote: true,
          semi: true,
          trailingComma: 'all',
        },
      ],
    },
  },
);
