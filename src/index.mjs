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
  } = options;

  /** @type {import('eslint').Linter.Config[]} */
  const configs = [
    // 1. Global ignores (standalone object — ESLint treats this specially)
    { ignores: [...DEFAULT_IGNORES, ...ignores] },

    // 2. Global languageOptions
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

    // 3. Base (eslint recommended)
    ...base(),

    // 4. TypeScript (strictTypeChecked + AI guardrails)
    ...typescript({ tsconfigRootDir, disableTypeChecked }),

    // 5. Import organization
    ...importX(),

    // 6. Modern JS enforcement
    ...unicorn(),

    // 7. Complexity + bug detection
    ...sonarjs(),

    // 8. Node.js best practices
    ...node(),

    // 9. Prettier (MUST be last — disables formatting rules)
    ...prettier(),
  ];

  // 10. User rule overrides (absolute last)
  if (Object.keys(overrides).length > 0) {
    configs.push({ rules: overrides });
  }

  return configs;
}
