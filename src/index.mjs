import globals from 'globals';
import { base } from './configs/base.mjs';
import { typescript } from './configs/typescript.mjs';
import { unicorn } from './configs/unicorn.mjs';
import { sonarjs } from './configs/sonarjs.mjs';
import { importX } from './configs/import-x.mjs';
import { node } from './configs/node.mjs';
import { prettier } from './configs/prettier.mjs';

const DEFAULT_IGNORES = [
  'dist/**',
  'build/**',
  'output/**',
  'node_modules/**',
  'coverage/**',
  '.next/**',
  '.nuxt/**',
  '.output/**',
];

/**
 * Create an opinionated ESLint flat config for TypeScript projects.
 * Designed as AI coding guardrails — strict type checks, complexity detection,
 * modern JS enforcement, and Prettier compatibility.
 *
 * @param {import('./index.d.mts').DefineConfigOptions} options
 * @returns {import('eslint').Linter.Config[]}
 */
export function defineConfig(options = {}) {
  const {
    tsconfigRootDir,
    ignores = [],
    overrides = {},
    disableTypeChecked = false,
    abbreviations = {},
    abbreviationIgnore = [],
    testFiles = [],
    maxCycleDepth,
  } = options;

  /** @type {import('eslint').Linter.Config[]} */
  const configs = [
    // 1. Global ignores (standalone object — ESLint treats this specially)
    { ignores: [...DEFAULT_IGNORES, ...ignores] },

    // 2. Linter self-protection: disable comments are an escape hatch, not a guardrail.
    {
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: 'error',
        reportUnusedInlineConfigs: 'error',
      },
    },

    // 3. Global languageOptions
    {
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: {
          ...globals.node,
          ...globals.es2025,
        },
      },
    },

    // 4. Base (eslint recommended)
    ...base(),

    // 5. TypeScript (strictTypeChecked + AI guardrails)
    ...typescript({ tsconfigRootDir, disableTypeChecked }),

    // 6. Import organization
    ...importX({ maxCycleDepth }),

    // 7. Modern JS enforcement
    ...unicorn({ abbreviations, abbreviationIgnore }),

    // 8. Complexity + bug detection
    ...sonarjs(),

    // 9. Node.js best practices
    ...node({ testFiles }),

    // 10. Prettier (MUST be last before local semantic overrides)
    ...prettier(),

    // 11. CommonJS files should parse with CommonJS semantics even in ESM-first projects.
    {
      files: ['**/*.{cjs,cts}'],
      languageOptions: {
        sourceType: 'commonjs',
      },
    },
  ];

  // 12. User rule overrides (absolute last)
  if (Object.keys(overrides).length > 0) {
    configs.push({ rules: overrides });
  }

  return configs;
}
