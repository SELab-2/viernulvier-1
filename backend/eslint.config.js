import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import nodePlugin from 'eslint-plugin-n';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // 1. Global Ignores
  // We ignore the config file itself to prevent the "file not found in project" error
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'eslint.config.js'
    ],
  },

  // 2. Base Configurations
  js.configs.recommended,
  security.configs.recommended,
  nodePlugin.configs['flat/recommended'],

  // 3. TypeScript & Type-Aware Rules
  {
    // Apply these specifically to TS files
    files: ['**/*.ts', '**/*.mts'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // --- CRITICAL BACKEND SAFETY ---
      // Prevents the #1 Node.js bug: unawaited async calls
      '@typescript-eslint/no-floating-promises': 'error',
      // Ensures you don't await things that aren't promises
      '@typescript-eslint/await-thenable': 'error',
      // Forces proper return await for better stack traces in Fastify
      'no-return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'always'],
      
      // --- FLEXIBILITY ---
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      
      // --- FASTIFY / NODE SPECIFIC ---
      'n/no-process-exit': 'error',
      'n/handle-callback-err': 'error',
    },
  },

  // 4. JavaScript Bypass
  // This ensures pure JS files don't trigger "Type-Aware" errors
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // 5. Prettier (Must be last)
  prettierConfig
);