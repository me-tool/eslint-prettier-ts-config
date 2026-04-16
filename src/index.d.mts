import type { Linter } from 'eslint';

export interface DefineConfigOptions {
  /**
   * Absolute path to the directory containing tsconfig.json.
   * Defaults to `process.cwd()`.
   */
  tsconfigRootDir?: string;

  /**
   * Additional global ignore patterns.
   * Extends (does not replace) the built-in defaults:
   * `dist/`, `build/`, `output/`, `node_modules/`, `coverage/`, `.next/`, `.nuxt/`, `.output/`
   */
  ignores?: string[];

  /**
   * Rule overrides applied as the final config object.
   * Useful for relaxing or tightening specific rules per-project.
   *
   * @example
   * defineConfig({ overrides: { 'no-console': 'warn' } })
   */
  overrides?: Record<string, Linter.RuleEntry>;

  /**
   * Disable all type-checked rules. Falls back to `strict` + `stylistic`
   * (non-type-aware variants), which still provides substantial linting.
   * Useful for JS-only projects that don't have a tsconfig.json.
   * @default false
   */
  disableTypeChecked?: boolean;
}

/**
 * Create an opinionated ESLint flat config for TypeScript projects.
 * Designed as AI coding guardrails.
 */
export declare function defineConfig(options?: DefineConfigOptions): Linter.Config[];
