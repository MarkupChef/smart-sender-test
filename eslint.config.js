import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import fs from 'node:fs';
import path from 'node:path';
import tseslint from 'typescript-eslint';

// Module boundaries (constitution Principle VI): app → features → api | shared.
// Each zone lists everything it must not import; a later block replaces the rule
// for its files, so every zone is complete on its own.
const forbid = (...patterns) => ['error', { patterns: patterns.flat() }];

// Bans a top-level src dir by alias and by relative path. Relative specifiers are not
// resolved by the rule, so they match on any path segment named `dir`.
// `except` is a regex fragment placed right after `dir`, e.g. a negative lookahead.
const dirImport = (dir, message, except = '') => [
  { regex: `^@/${dir}${except}(/|$)`, message },
  { regex: `^\\.{1,2}/(.*/)?${dir}${except}(/|$)`, message },
];

const reactAndTanstack = {
  group: ['react', 'react-dom', 'react/*', 'react-dom/*', '@tanstack/*'],
  message: 'src/api is framework-agnostic: no React or TanStack (Principle III).',
};
const appImport = dirImport('app', 'Only main.tsx and app may use app.');
const featuresFromApi = dirImport('features', 'api must not depend on features.');
const mocksImport = dirImport('mocks', 'Only src/main.tsx and api tests may import mocks.');

// One block per feature dir, so a new feature is isolated without touching this file.
const featuresDir = path.join(import.meta.dirname, 'src/features');
const features = fs.existsSync(featuresDir)
  ? fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];
const crossFeature = 'Features do not import each other.';
const featureZones = features.map((feature) => ({
  files: [`src/features/${feature}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': forbid(
      appImport,
      mocksImport,
      features
        .filter((other) => other !== feature)
        .flatMap((other) => [
          { regex: `^@/features/${other}(/|$)`, message: crossFeature },
          { regex: `^\\.{1,2}/(.*/)?${other}(/|$)`, message: crossFeature },
        ]),
    ),
  },
}));

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
      '@typescript-eslint/only-throw-error': [
        'error',
        { allow: [{ from: 'package', package: '@tanstack/router-core', name: 'Redirect' }] },
      ],
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
      'no-restricted-imports': forbid(
        reactAndTanstack,
        featuresFromApi,
        appImport,
        dirImport(
          'mocks',
          'api tests may import only mocks/server and mocks/db.',
          '(?!/(server|db)$)',
        ),
      ),
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbid(appImport, mocksImport),
    },
  },
  ...featureZones,
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbid(
        appImport,
        mocksImport,
        dirImport('features', 'shared must not depend on features.'),
      ),
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbid(mocksImport),
    },
  },
  {
    // The entry point starts the mock worker and touches nothing else in mocks.
    files: ['src/main.tsx'],
    rules: {
      'no-restricted-imports': forbid(
        dirImport('mocks', 'main.tsx may import only mocks/browser.', '(?!/browser$)'),
      ),
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
