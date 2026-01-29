import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginPlaywright from 'eslint-plugin-playwright';
import pluginImport from 'eslint-plugin-import';
import pluginUnused from 'eslint-plugin-unused-imports';

export default [
  {
    ignores: ['node_modules', 'dist', 'playwright-report', '**/*.bundle.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: pluginImport,
      'unused-imports': pluginUnused,
      playwright: pluginPlaywright,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      'import/order': 'off',
      'import/no-unresolved': 'off',

      'playwright/no-wait-for-timeout': 'off',
      'playwright/no-page-pause': 'error',
      'playwright/no-wait-for-selector': 'warn',
    },
  },

  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];
