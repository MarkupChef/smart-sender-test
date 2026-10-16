import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Module boundaries (constitution Principle VI): app → features → api | shared.
// Each zone lists everything it must not import; a later block replaces the rule
// for its files, so every zone is complete on its own.
const forbid = (...patterns) => ['error', { patterns }];

const reactAndTanstack = {
  group: ['react', 'react-dom', 'react/*', 'react-dom/*', '@tanstack/*'],
  message: 'src/api is framework-agnostic: no React or TanStack (Principle III).',
};
const appImport = { group: ['@/app', '@/app/*'], message: 'Only main.tsx and app may use app.' };
const featuresFromApi = {
  group: ['@/features', '@/features/*'],
  message: 'api must not depend on features.',
};
const mocksImport = {
  group: ['@/mocks', '@/mocks/*'],
  message: 'Only src/main.tsx and api tests may import mocks.',
};

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'public/mockServiceWorker.js',
    'specs',
    '.specify',
    '.claude',
    'docs',
  ]),
  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/api/**/*.ts'],
    rules: {
      'no-restricted-imports': forbid(reactAndTanstack, featuresFromApi, appImport, mocksImport),
    },
  },
  {
    // One shared mock (Principle V): transport tests use the same server and db as the app.
    files: ['src/api/**/*.test.ts'],
    rules: {
      'no-restricted-imports': forbid(reactAndTanstack, featuresFromApi, appImport, {
        regex: '^@/mocks(?!/(server|db)$)',
        message: 'api tests may import only @/mocks/server and @/mocks/db.',
      }),
    },
  },
  {
    files: ['src/features/auth/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbid(appImport, mocksImport, {
        group: ['@/features/webhooks', '@/features/webhooks/*'],
        message: 'Features do not import each other.',
      }),
    },
  },
  {
    files: ['src/features/webhooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbid(appImport, mocksImport, {
        group: ['@/features/auth', '@/features/auth/*'],
        message: 'Features do not import each other.',
      }),
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbid(appImport, mocksImport, {
        group: ['@/features', '@/features/*'],
        message: 'shared must not depend on features.',
      }),
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbid(mocksImport),
    },
  },
  {
    files: ['src/mocks/**/*.ts'],
    rules: {
      'no-restricted-imports': forbid({
        regex: '^@/(?!api/schemas$)',
        message: 'mocks may import only @/api/schemas from the app.',
      }),
    },
  },
  prettier,
]);
